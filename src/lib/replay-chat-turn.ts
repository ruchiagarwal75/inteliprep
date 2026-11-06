import "server-only";
import type { ChatTurnRequest } from "@/lib/chat-turn";
import type { InterviewTranscript } from "@/lib/interview-transcript";
import type { ProblemDefinition } from "@/lib/problems";
import { interviewSessionCheckpoint } from "@/lib/interview-sessions";
import { publicPhase } from "@/lib/phase-config";
import { INTERVIEW_PHASE_HEADER } from "@/lib/interview-phase";
import { INTERVIEW_STREAM_TYPE } from "@/lib/interview-stream";
import { chatResponse } from "@/lib/chat-response";

/** Re-deliver a committed reply after a lost response, without stage or model work. */
export async function replayChatTurn(
  request: Request,
  input: ChatTurnRequest,
  problem: ProblemDefinition,
  prior: NonNullable<InterviewTranscript["lastTurn"]>,
  release: () => Promise<void>,
  requestId: string,
) {
  const checkpoint = interviewSessionCheckpoint(
    input.sessionId,
    input,
    input.resumeToken,
  );
  const phase = publicPhase(problem.phases, checkpoint.phaseIndex);
  const framed = request.headers.get("Accept") === INTERVIEW_STREAM_TYPE;
  const deltas = (async function* () {
    yield prior.reply;
  })();
  return chatResponse(
    deltas,
    await deltas.next(),
    {
      "Content-Type": framed
        ? INTERVIEW_STREAM_TYPE
        : "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      [INTERVIEW_PHASE_HEADER]: encodeURIComponent(JSON.stringify(phase)),
      ...(prior.listening ? { "X-Interview-Reply-Kind": "listening" } : {}),
    },
    () => {},
    release,
    () => {},
    framed
      ? () => ({
          phase,
          replayed: true as const,
          resumeToken: checkpoint.resumeToken,
          ...(prior.listening ? { replyKind: "listening" as const } : {}),
        })
      : undefined,
    requestId,
  );
}
