"use client";
import { useEffect } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
export function ScorecardViewTracker({ interviewId }: { interviewId: string }) {
  const { request } = useCandidateAccount();
  useEffect(() => {
    let sent = false,
      busy = false;
    async function record() {
      if (document.hidden || sent || busy) return;
      busy = true;
      try {
        const response = await request("/api/interview/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId }),
          signal: AbortSignal.timeout(5000),
        });
        sent = response.ok;
      } catch {
        /* Tracking must not interrupt feedback. */
      } finally {
        busy = false;
      }
    }
    void record();
    document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
  }, [interviewId, request]);
  return null;
}
