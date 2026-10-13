"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  remainingInterviewSeconds,
  type InterviewTiming,
} from "@/lib/interview-timer";

function subscribe(tick: () => void) {
  const interval = setInterval(tick, 250);
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("focus", tick);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", tick);
    window.removeEventListener("focus", tick);
  };
}

export function useInterviewTimer(
  timing?: InterviewTiming,
  clockOffsetMs = 0,
  ended = false,
) {
  // Wall time also accounts for laptop sleep; never decrement a tick counter.
  const readSeconds = useCallback(
    () => remainingInterviewSeconds(timing, Date.now() + clockOffsetMs),
    [timing, clockOffsetMs],
  );
  const subscribeClock = useCallback(
    (tick: () => void) => (timing && !ended ? subscribe(tick) : () => {}),
    [timing, ended],
  );
  const serverSnapshot = useCallback(
    () => (timing ? timing.durationMinutes * 60 : 0),
    [timing],
  );
  const remainingSeconds = useSyncExternalStore(
    subscribeClock,
    readSeconds,
    serverSnapshot,
  );
  const isExpiredNow = useCallback(
    () => Boolean(timing) && readSeconds() === 0,
    [timing, readSeconds],
  );
  return {
    remainingSeconds,
    expired: Boolean(timing) && remainingSeconds === 0,
    isExpiredNow,
  };
}
