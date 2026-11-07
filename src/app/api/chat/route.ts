import { trackCurrentInterview } from "@/lib/interview-tracking";
import { setInterviewReference } from "@/lib/reporting-context";
import { getCachedSession } from "@/lib/interview-session-store";
import { hasExplanation } from "@/lib/open-question";
import {
  chatError as error,
  upstreamChatError as upstreamError,
} from "@/lib/chat-api-error";
import { chatTurnRequestSchema } from "@/lib/chat-turn";
import { prepareTranscriptTurn } from "@/lib/interview-transcript";
import { replayChatTurn } from "@/lib/replay-chat-turn";
import { hasApiKey, streamInterviewerReply } from "@/lib/llm";
import { sceneToGraph } from "@/lib/scene-graph";
import { graphToText } from "@/lib/scene-to-text";
import { diffSceneGraphs } from "@/lib/scene-diff";
import { getProblem } from "@/lib/problems";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { InterviewSessionError } from "@/lib/interview-sessions";
import { INTERVIEW_PHASE_HEADER } from "@/lib/interview-phase";
import { chatResponse } from "@/lib/chat-response";
import { INTERVIEW_STREAM_TYPE } from "@/lib/interview-stream";
import {
  ApiRequestError,
  readJsonBody,
  withApiRequest,
} from "@/lib/api-request";
import { openSharedSession } from "@/lib/shared-interview-session";
import { logServerEvent } from "@/lib/server-events";
import { retryInterviewerReply } from "@/lib/interviewer-retry";
import { withDevelopmentModelFault } from "@/lib/development-model-fault";

export const runtime = "nodejs";
export const maxDuration = 120;

async function chat(request: Request, requestId: string): Promise<Response> {
  const body = await readJsonBody(request, 4_000_000);

  const parsed = chatTurnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const problem = getProblem(parsed.data.problemId);
  if (!problem) return error("Unknown interview problem", 404);

  setInterviewReference(parsed.data.sessionId);
  if (!hasApiKey()) {
    return error("Server is missing OPENAI_KEY", 500);
  }
  const shared = parsed.data.sessionId
    ? await openSharedSession(
        parsed.data.sessionId,
        parsed.data,
        parsed.data.resumeToken,
      )
    : undefined;

  let conversation;
  try {
    conversation = prepareTranscriptTurn(parsed.data);
    if (conversation.replay)
      return await replayChatTurn(
        request,
        parsed.data,
        problem,
        conversation.replay,
        async () => {
          await shared?.release();
        },
        requestId,
      );
  } catch (cause) {
    await shared?.release();
    throw cause;
  }
  const data = conversation.request;
  if (!data) throw new ApiRequestError("Invalid candidate turn", 400);

  setInterviewReference(
    parsed.data.sessionId,
    getCachedSession(parsed.data.sessionId)?.timing?.durationMinutes === 1,
  );
  const latest = data.messages.at(-1);
  await trackCurrentInterview(parsed.data.sessionId, {
    activity: {
      firstResponse:
        latest?.source !== "control" && Boolean(latest?.content.trim()),
      designPresented:
        latest?.action === "review" && hasExplanation(data.messages),
    },
  });
  const replyStartedAt = Date.now();
  const graph = sceneToGraph(data.scene);
  const diagramText = graphToText(graph);
  const previousGraph = data.previousScene
    ? sceneToGraph(data.previousScene)
    : undefined;
  const changeText = diffSceneGraphs(graph, previousGraph);
  const abort = new AbortController();
  const cancel = () => abort.abort();
  if (request.signal.aborted) cancel();
  request.signal.addEventListener("abort", cancel, { once: true });
  let turn;
  try {
    turn = await prepareInterviewTurn(problem, data, abort.signal);
  } catch (cause) {
    request.signal.removeEventListener("abort", cancel);
    await shared?.release();
    return cause instanceof InterviewSessionError
      ? error(cause.message, cause.status, cause.code)
      : upstreamError(cause, requestId);
  }
  let completion: Promise<void> | undefined;
  let releasing: Promise<void> | undefined;
  const release = () => {
    releasing ??= (async () => {
      await completion?.catch(() => {});
      turn.release();
      request.signal.removeEventListener("abort", cancel);
      await shared?.release();
    })();
    return releasing;
  };
  const complete = (reply: string) => {
    completion = (async () => {
      abort.signal.throwIfAborted();
      conversation.commit(reply, Boolean(turn.context.listening));
      turn.commit(reply);
      try {
        await shared?.persist();
        abort.signal.throwIfAborted();
        logServerEvent({
          event: "chat_reply_complete",
          route: "/api/chat",
          requestId,
          durationMs: Date.now() - replyStartedAt,
        });
      } catch (cause) {
        try {
          await shared?.rollback();
        } catch (rollbackError) {
          logServerEvent(
            {
              event: "api_failure",
              requestId,
              route: "/api/chat",
              status: 503,
            },
            rollbackError,
          );
        }
        throw cause;
      }
    })();
    return completion;
  };
  if (process.env.NODE_ENV === "development") {
    console.log("[chat] Whiteboard metadata", {
      elementCount: data.scene?.elements.length ?? 0,
      hasImage: Boolean(data.diagramImage),
    });
    console.log("[chat] Interview step: %s", turn.context.progress.step);
    if (turn.phase) console.log("[chat] Interview stage: %s", turn.phase.title);
  }
  const deltas = retryInterviewerReply(
    (signal) =>
      streamInterviewerReply(
        data.messages,
        diagramText,
        changeText,
        signal,
        data.diagramImage,
        turn.context,
      ),
    abort.signal,
  );

  // Pull the first delta before answering, so an upstream failure still maps to
  // a real status code and a readable message instead of an empty body.
  let first;
  try {
    first = await deltas.next();
  } catch (cause) {
    await release();
    return upstreamError(cause, requestId);
  }
  const framed = request.headers.get("Accept") === INTERVIEW_STREAM_TYPE;
  return chatResponse(
    deltas,
    first,
    {
      "Content-Type": framed
        ? INTERVIEW_STREAM_TYPE
        : "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(turn.context.listening
        ? { "X-Interview-Reply-Kind": "listening" }
        : {}),
      ...(turn.phase
        ? {
            [INTERVIEW_PHASE_HEADER]: encodeURIComponent(
              JSON.stringify(turn.phase),
            ),
          }
        : {}),
    },
    complete,
    release,
    cancel,
    framed
      ? () => ({
          phase: turn.completedPhase(),
          resumeToken: turn.checkpoint?.(),
          ...(turn.context.listening
            ? { replyKind: "listening" as const }
            : {}),
        })
      : undefined,
    requestId,
  );
}

export const POST = withApiRequest("chat", "/api/chat", (request, requestId) =>
  withDevelopmentModelFault(() => chat(request, requestId)),
);
