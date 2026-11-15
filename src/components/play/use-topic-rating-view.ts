"use client";

import { useEffect, useRef } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import type { TopicRatingInput } from "@/lib/play/topic-rating-public";

/** Count a visible popup, not an eligibility check or a background tab. */
export function useTopicRatingView(open: boolean, sessionId: string) {
  const { request } = useCandidateAccount();
  const sentFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let active = true,
      attempts = 0,
      frame = 0,
      retry = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(send);
    };
    function send() {
      if (document.hidden || sentFor.current === sessionId) return;
      sentFor.current = sessionId;
      const input: TopicRatingInput = { sessionId, action: "shown" };
      void request("/api/play/topic-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      })
        .then((response) => {
          if (!response.ok) throw Error("unavailable");
        })
        .catch(() => {
          sentFor.current = null;
          if (active && attempts++ === 0)
            retry = window.setTimeout(schedule, 1000);
        });
    }
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [open, request, sessionId]);
}
