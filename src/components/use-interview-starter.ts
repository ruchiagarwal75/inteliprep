"use client";

import { useEffect, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import type { InterviewStart } from "@/lib/interview-selection";
import { startInterview } from "@/lib/start-interview";
import type { InterviewDuration } from "@/lib/interview-timer";
import type { InterviewSelection } from "@/lib/interview-selection";

export type InterviewChoice = InterviewSelection & {
  durationMinutes: InterviewDuration;
};
export function useInterviewStarter(
  startSaved: (interview: InterviewStart, replace: boolean) => Promise<void>,
  prepareReplacement: () => Promise<boolean>,
  initial: InterviewChoice,
) {
  const { request } = useCandidateAccount();
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // Compile the local POST route while the workspace loads, without creating a session.
    // Next supplies OPTIONS automatically; this neither starts a timer nor uses a start quota.
    void request("/api/interview/start", { method: "OPTIONS" }).catch(() => {});
  }, [request]);
  const [choice, setChoice] = useState(initial);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string>();
  const startingRef = useRef(false);
  async function start(next: InterviewChoice = choice, replace = false) {
    if (startingRef.current) return;
    startingRef.current = true;
    setIsStarting(true);
    setError(undefined);
    setChoice(next);
    let started = false;
    try {
      started = await startInterview({
        choice: next,
        replace,
        request,
        prepareReplacement,
        commit: startSaved,
        onTiming:
          process.env.NODE_ENV === "development"
            ? (timing) => console.info("[interview] Start timing", timing)
            : undefined,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn't start the interview.",
      );
    } finally {
      // A successful start navigates to the saved interview; keep the brief locked until it unmounts.
      if (!started) {
        startingRef.current = false;
        setIsStarting(false);
      }
    }
  }
  return { choice, setChoice, isStarting, error, start };
}
