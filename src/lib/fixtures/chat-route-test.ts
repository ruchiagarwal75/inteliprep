import { chatTurnPayload } from "@/lib/chat-turn";
import { chatRequestSchema } from "@/lib/chat";
import { getProblem, createInterviewStart } from "@/lib/problems";
import { getCachedSession } from "@/lib/interview-session-store";
import { sealSession } from "@/lib/session-token";

/** Seed trusted prior turns for route unit tests that start partway through a conversation.
 * Security/transport tests must send raw payloads instead of using this fixture.
 */
export function chatRouteFixture(body: Record<string, unknown>) {
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return body;
  const problem =
    getProblem(parsed.data.problemId) ?? getProblem("url-shortener");
  if (!problem) throw new Error("Missing test problem");
  const input = parsed.data;
  const started = input.sessionId
    ? undefined
    : createInterviewStart(problem, input.level);
  const id = input.sessionId ?? started?.sessionId;
  const session = id ? getCachedSession(id) : undefined;
  if (session && !session.busy)
    session.transcript = {
      messages: structuredClone(input.messages.slice(0, -1)),
    };
  const resumeToken =
    input.resumeToken ??
    (session
      ? sealSession({
          ...session,
          ending: session.ending
            ? {
                endedAt: session.ending.endedAt,
                snapshotHash: session.ending.snapshotHash,
              }
            : undefined,
        })
      : (started?.resumeToken ?? "abc.def.ghi"));
  return chatTurnPayload({ ...input, sessionId: id, resumeToken });
}

/** Grading route fixtures represent an interview already recorded by the server. */
export function endRouteFixture(body: Record<string, unknown>) {
  const parsed = chatRequestSchema.safeParse(body);
  const session =
    typeof body.sessionId === "string"
      ? getCachedSession(body.sessionId)
      : undefined;
  if (parsed.success && session && !session.busy && !session.ending)
    session.transcript = { messages: structuredClone(parsed.data.messages) };
  return body;
}
