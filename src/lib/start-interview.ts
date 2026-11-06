import {
  interviewStartSchema,
  type InterviewStart,
  type InterviewSelection,
} from "@/lib/interview-selection";
import type { InterviewDuration } from "@/lib/interview-timer";
import { responseRateLimit } from "@/lib/retry-after";
export type InterviewStartTiming = {
  prepareMs: number;
  requestMs: number;
  saveMs: number;
  totalMs: number;
};

/** Keep the current workspace until a validated response can replace it in one commit. */
export async function startInterview({
  choice,
  replace,
  request,
  prepareReplacement,
  commit,
  onTiming,
}: {
  choice: InterviewSelection & { durationMinutes: InterviewDuration };
  replace: boolean;
  request: typeof fetch;
  prepareReplacement: () => Promise<boolean>;
  commit: (interview: InterviewStart, replace: boolean) => Promise<void>;
  onTiming?: (timing: InterviewStartTiming) => void;
}): Promise<boolean> {
  const startedAt = performance.now();
  if (replace && !(await prepareReplacement())) return false;
  const preparedAt = performance.now();
  const response = await request("/api/interview/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(choice),
  });
  const body: unknown = await response.json();
  const receivedAt = performance.now();
  const limited = responseRateLimit(response);
  if (limited) throw limited;
  if (!response.ok)
    throw new Error(
      body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
        ? body.error
        : "Couldn't start the interview. Please retry.",
    );
  await commit(interviewStartSchema.parse(body), replace);
  const savedAt = performance.now();
  onTiming?.({
    prepareMs: Math.round(preparedAt - startedAt),
    requestMs: Math.round(receivedAt - preparedAt),
    saveMs: Math.round(savedAt - receivedAt),
    totalMs: Math.round(savedAt - startedAt),
  });
  return true;
}
