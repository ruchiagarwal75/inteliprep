"use client";

import { useEffect, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { PracticeFeedbackForm } from "@/components/practice-feedback-form";
import styles from "./practice-feedback.module.css";

export function InterviewFeedbackCard({
  interviewId,
}: {
  interviewId: string;
}) {
  const { userId, request } = useCandidateAccount();
  const [phase, setPhase] = useState<"checking" | "ready" | "hidden">(
    "checking",
  );
  const key = `mockmeai:feedback:${userId}:${interviewId}`;
  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      try {
        if (localStorage.getItem(key) === "handled") {
          setPhase("hidden");
          return;
        }
      } catch {
        /* Server status still works when browser storage is unavailable. */
      }
      try {
        const response = await request(
          `/api/feedback?interviewId=${encodeURIComponent(interviewId)}`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(8000),
            ]),
          },
        );
        const data = response.ok ? await response.json() : undefined;
        if (!controller.signal.aborted)
          setPhase(data?.handled ? "hidden" : "ready");
      } catch {
        if (!controller.signal.aborted) setPhase("ready");
      }
    }
    void check();
    return () => controller.abort();
  }, [interviewId, key, request]);
  if (phase !== "ready") return null;
  return (
    <section
      className={`paper-card ${styles.card}`}
      aria-label="Interview feedback"
    >
      <PracticeFeedbackForm
        interviewId={interviewId}
        onSaved={() => {
          try {
            localStorage.setItem(key, "handled");
          } catch {
            /* Persisted on the server. */
          }
        }}
        onComplete={() => setPhase("hidden")}
      />
    </section>
  );
}
