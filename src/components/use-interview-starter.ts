"use client";

import { useRef, useState } from "react";
import {
  interviewStartSchema,
  type InterviewStart,
} from "@/lib/interview-selection";
import type { InterviewDuration } from "@/lib/interview-timer";
import type { InterviewSelection } from "@/lib/interview-selection";

export type InterviewChoice = InterviewSelection & {
  durationMinutes: InterviewDuration;
};
export function useInterviewStarter(
  startSaved: (interview: InterviewStart) => Promise<void>,
  reset: () => Promise<boolean>,
  initial: InterviewChoice,
) {
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
    try {
      if (replace && !(await reset())) return;
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const body: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
            ? body.error
            : "Couldn't start the interview. Please retry.",
        );
      await startSaved(interviewStartSchema.parse(body));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn't start the interview.",
      );
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }
  return { choice, setChoice, isStarting, error, start };
}
