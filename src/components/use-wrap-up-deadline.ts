"use client";
import { useEffect, useRef } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import type { InterviewStart } from "@/lib/interview-selection";
import type { InterviewPhase } from "@/lib/interview-phase";
import type { InterviewSaveUpdate } from "@/lib/saved-interview";
import { interviewResumeResponseSchema } from "@/lib/interview-resume";
export function useWrapUpDeadline(
  interview: InterviewStart | undefined,
  remaining: number,
  busy: boolean,
  token: () => string | undefined,
  onPhase: (phase: InterviewPhase) => void,
  save: (update: InterviewSaveUpdate) => Promise<void>,
) {
  const { request } = useCandidateAccount();
  const applied = useRef(false);
  useEffect(() => {
    if (
      !interview?.timing ||
      interview.timing.durationMinutes === 1 ||
      busy ||
      remaining > 480 ||
      remaining <= 0 ||
      applied.current
    )
      return;
    applied.current = true;
    void (async () => {
      const response = await request("/api/interview/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: interview.problemId,
          level: interview.level,
          sessionId: interview.sessionId,
          resumeToken: token() ?? interview.resumeToken,
        }),
      });
      if (!response.ok) {
        applied.current = false;
        return;
      }
      const data = interviewResumeResponseSchema.parse(await response.json());
      onPhase(data.phase);
      await save({ phase: data.phase, resumeToken: data.resumeToken });
    })().catch(() => {
      applied.current = false;
    });
  }, [interview, remaining, busy, token, onPhase, save, request]);
}
