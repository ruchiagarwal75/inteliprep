import type { ChatRequest } from "@/lib/chat";
import { isCandidateAuthFailure } from "@/lib/candidate-api-error";
import {
  interviewRecoveryFailure,
  InterviewRecoveryError,
} from "@/lib/interview-recovery";
import {
  INTERVIEW_STREAM_TYPE,
  receiveInterviewStream,
} from "@/lib/interview-stream";

export const INTERVIEWER_UNAVAILABLE =
  "Interviewer unavailable. Please try again.";

/** Keep dependency failures in the interview; only app-auth responses may require sign-in. */
export async function postChatTurn(
  request: typeof fetch,
  payload: ChatRequest,
  onStart: (listening: boolean) => void,
  onDelta: (text: string) => void,
) {
  let response: Response;
  try {
    response = await request("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: INTERVIEW_STREAM_TYPE,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(INTERVIEWER_UNAVAILABLE);
  }
  if (!response.ok || !response.body) {
    const body: unknown = await response.json().catch(() => null);
    const recovery = interviewRecoveryFailure(response.status, body);
    if (recovery) throw new InterviewRecoveryError(recovery);
    const error =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string" &&
      body.error.trim()
        ? body.error.slice(0, 1_000)
        : INTERVIEWER_UNAVAILABLE;
    throw new Error(
      (response.status === 401 || response.status === 403) &&
        !isCandidateAuthFailure(response)
        ? INTERVIEWER_UNAVAILABLE
        : error,
    );
  }
  const listening =
    response.headers.get("X-Interview-Reply-Kind") === "listening";
  onStart(listening);
  try {
    const completed = await receiveInterviewStream(response.body, (text) => {
      if (!listening) onDelta(text);
    });
    const { phase, resumeToken } = completed.checkpoint;
    if (!phase || !resumeToken) throw new Error("Missing checkpoint");
    return {
      reply: completed.reply,
      phase,
      resumeToken,
      listening: completed.checkpoint.replyKind === "listening",
    };
  } catch {
    throw new Error("The interviewer's reply was interrupted. Please retry.");
  }
}
