"use client";

import { useEffect, useRef } from "react";
import { shouldAutoEndInterview } from "@/lib/interview-timer";

export function useInterviewAutoEnd(
  state: Omit<Parameters<typeof shouldAutoEndInterview>[0], "attempted">,
  end: () => Promise<void>,
) {
  const attemptedRef = useRef(false);
  useEffect(() => {
    if (shouldAutoEndInterview({ ...state, attempted: attemptedRef.current })) {
      attemptedRef.current = true;
      void end();
    }
  }, [state, end]);
}
