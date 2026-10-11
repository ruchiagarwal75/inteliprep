import { APIError } from "openai";
import { chatRequestSchema } from "@/lib/chat";
import { hasApiKey, streamInterviewerReply } from "@/lib/llm";
import { sceneToGraph } from "@/lib/scene-graph";
import { graphToText } from "@/lib/scene-to-text";
import { diffSceneGraphs } from "@/lib/scene-diff";
import { getProblem } from "@/lib/problems";
import { prepareInterviewTurn } from "@/lib/interview-turn";
import { InterviewSessionError } from "@/lib/interview-sessions";
import { INTERVIEW_PHASE_HEADER } from "@/lib/interview-phase";
import { chatResponse } from "@/lib/chat-response";

export const runtime = "nodejs";

function error(message: string, status: number, code?: string): Response {
  return Response.json(
    { error: message, ...(code ? { code } : {}) },
    { status },
  );
}

/** Keeps provider detail (billing URLs, org ids) out of the client response
 * while leaving the code visible enough to debug against the logs. */
function upstreamError(cause: unknown): Response {
  console.error("chat upstream failed", cause);
  if (cause instanceof APIError) {
    const status = cause.status ?? 502;
    return error(
      "The language model rejected the request",
      status,
      cause.code ?? undefined,
    );
  }
  return error("The language model could not be reached", 502);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Body must be valid JSON", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const problem = getProblem(parsed.data.problemId);
  if (!problem) return error("Unknown interview problem", 404);

  if (!hasApiKey()) {
    return error("Server is missing OPENAI_KEY", 500);
  }

  const graph = sceneToGraph(parsed.data.scene);
  const diagramText = graphToText(graph);
  const previousGraph = parsed.data.previousScene
    ? sceneToGraph(parsed.data.previousScene)
    : undefined;
  const changeText = diffSceneGraphs(graph, previousGraph);
  const abort = new AbortController();
  const cancel = () => abort.abort();
  if (request.signal.aborted) cancel();
  request.signal.addEventListener("abort", cancel, { once: true });
  let turn;
  try {
    turn = await prepareInterviewTurn(problem, parsed.data, abort.signal);
  } catch (cause) {
    request.signal.removeEventListener("abort", cancel);
    return cause instanceof InterviewSessionError
      ? error(cause.message, cause.status)
      : upstreamError(cause);
  }
  const release = () => {
    turn.release();
    request.signal.removeEventListener("abort", cancel);
  };
  if (process.env.NODE_ENV === "development") {
    console.log("[chat] Current whiteboard diagram:\n%s", diagramText);
    console.log("[chat] Whiteboard changes:\n%s", changeText);
    console.log(
      "[chat] Whiteboard image: %s",
      parsed.data.diagramImage ? "attached" : "not attached",
    );
    console.log("[chat] Interview step: %s", turn.context.progress.step);
    if (turn.phase) console.log("[chat] Interview stage: %s", turn.phase.title);
  }
  const deltas = streamInterviewerReply(
    parsed.data.messages,
    diagramText,
    changeText,
    abort.signal,
    parsed.data.diagramImage,
    turn.context,
  );

  // Pull the first delta before answering, so an upstream failure still maps to
  // a real status code and a readable message instead of an empty body.
  let first;
  try {
    first = await deltas.next();
  } catch (cause) {
    release();
    return upstreamError(cause);
  }
  return chatResponse(
    deltas,
    first,
    {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(turn.phase
        ? {
            [INTERVIEW_PHASE_HEADER]: encodeURIComponent(
              JSON.stringify(turn.phase),
            ),
          }
        : {}),
    },
    turn.commit,
    release,
    cancel,
  );
}
