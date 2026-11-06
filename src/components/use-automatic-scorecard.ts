"use client";
import { useEffect, useRef } from "react";

/** A results-route mount retries unfinished grading once; errors still offer manual Retry. */
export function useAutomaticScorecard(
  ended: boolean,
  busy: boolean,
  complete: boolean,
  disabled: boolean,
  end: () => Promise<boolean>,
) {
  const attempted = useRef(false);
  useEffect(() => {
    if (!ended) return;
    if (busy || complete) {
      attempted.current = true;
      return;
    }
    if (disabled || attempted.current) return;
    attempted.current = true;
    void end();
  }, [ended, busy, complete, disabled, end]);
}
