"use client";

import { useEffect, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { InterviewDialog } from "@/components/interview-dialog";
import {
  topicRatingKey,
  topicRatingStatusSchema,
  type TopicRatingInput,
} from "@/lib/play/topic-rating-public";
import styles from "./first-topic-rating.module.css";

export function FirstTopicRating({ sessionId }: { sessionId: string }) {
  const { request, userId } = useCandidateAccount();
  const [phase, setPhase] = useState<
    "checking" | "waiting" | "open" | "thanks" | "hidden"
  >("checking");
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false),
    mounted = useRef(true),
    dismissed = useRef(false);
  const key = topicRatingKey(userId);
  function remember() {
    try {
      localStorage.setItem(key, "handled");
    } catch {
      /* Server remains authoritative. */
    }
  }
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    async function check() {
      try {
        try {
          if (localStorage.getItem(key) === "handled") {
            setPhase("hidden");
            return;
          }
        } catch {
          /* Storage may be blocked. */
        }
        const response = await request(
          `/api/play/topic-rating?sessionId=${sessionId}`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(8000),
            ]),
          },
        );
        if (!response.ok) throw Error("unavailable");
        const status = topicRatingStatusSchema.parse(await response.json());
        if (!controller.signal.aborted)
          setPhase(status.eligible ? "waiting" : "hidden");
      } catch {
        if (!controller.signal.aborted) setPhase("hidden");
      }
    }
    void check();
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [key, request, sessionId]);
  useEffect(() => {
    if (phase !== "waiting") return;
    // Let an earned level-up finish before opening another modal.
    let timer = window.setTimeout(show, 600);
    function show() {
      if (document.querySelector("dialog[open]"))
        timer = window.setTimeout(show, 250);
      else setPhase("open");
    }
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== "thanks") return;
    const timer = window.setTimeout(() => setPhase("hidden"), 1200);
    return () => window.clearTimeout(timer);
  }, [phase]);
  async function rate(stars: number) {
    if (locked.current) return;
    locked.current = true;
    setSelected(stars);
    setBusy(true);
    setError("");
    const input: TopicRatingInput = { sessionId, action: "rate", stars };
    try {
      const response = await request("/api/play/topic-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw Error("save");
      remember();
      if (mounted.current && !dismissed.current) setPhase("thanks");
    } catch {
      locked.current = false;
      if (mounted.current && !dismissed.current) {
        setBusy(false);
        setError("Couldn't save your rating. Please try again.");
      }
    }
  }
  function skip() {
    remember();
    setPhase("hidden");
    if (dismissed.current || phase === "thanks") return;
    dismissed.current = true;
    locked.current = true;
    const input: TopicRatingInput = { sessionId, action: "skip" };
    // Dismissing never holds up the quiz results, including during a network failure.
    void request("/api/play/topic-rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true,
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  }
  if (phase !== "open" && phase !== "thanks") return null;
  return (
    <InterviewDialog
      open
      title="How was your practice so far?"
      onClose={skip}
      className={styles.dialog}
    >
      {phase === "thanks" ? (
        <p role="status" className={styles.thanks}>
          Thanks!
        </p>
      ) : (
        <>
          <div
            className={styles.stars}
            role="group"
            aria-label="Rate your practice"
          >
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                key={stars}
                type="button"
                aria-label={`${stars} ${stars === 1 ? "star" : "stars"}`}
                aria-pressed={selected === stars}
                disabled={busy}
                onClick={() => void rate(stars)}
                data-selected={selected >= stars || undefined}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="32"
                  height="32"
                  aria-hidden="true"
                >
                  <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1Z" />
                </svg>
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button type="button" className="practice-link" onClick={skip}>
            Skip
          </button>
        </>
      )}
    </InterviewDialog>
  );
}
