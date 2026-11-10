"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import {
  LIKED_CHOICES,
  RETURN_CHOICES,
  type PracticeFeedbackInput,
} from "@/lib/practice-feedback";
import styles from "./practice-feedback.module.css";

export function PracticeFeedbackForm({
  interviewId,
  onSaved,
  onComplete,
}: {
  interviewId?: string;
  onSaved?: () => void;
  onComplete: () => void;
}) {
  const { request } = useCandidateAccount();
  const id = useId(),
    locked = useRef(false);
  const [liked, setLiked] = useState<PracticeFeedbackInput["liked"]>();
  const [wouldReturn, setWouldReturn] =
    useState<PracticeFeedbackInput["wouldReturn"]>();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const complete = useRef(onComplete);
  useEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => complete.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [sent]);
  async function submit(skipped: boolean) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const response = await request("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          source: interviewId ? "interview_end" : "menu",
          skipped,
          ...(!skipped
            ? { liked, wouldReturn, comment: comment.trim() || undefined }
            : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const retry = Number(response.headers.get("Retry-After"));
        throw new Error(
          response.status === 429
            ? `Please try again in ${Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : 60} seconds.`
            : response.status === 413
              ? "This comment is too large to send. Please shorten it and try again."
              : "Feedback couldn't be saved. Please try again. Your scorecard is unaffected.",
        );
      }
      onSaved?.();
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === "Error"
          ? cause.message
          : "Feedback couldn't be saved. Please try again.",
      );
      locked.current = false;
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <p role="status" className={styles.thanks}>
        Thanks!
      </p>
    );
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      <fieldset disabled={busy}>
        <legend>How was your practice interview?</legend>
        <div className={styles.choices}>
          {LIKED_CHOICES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={liked === value}
              className={styles.choice}
              onClick={() => setLiked(liked === value ? undefined : value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Would you do another interview on MockMeAI?</legend>
        <div className={styles.choices}>
          {RETURN_CHOICES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={wouldReturn === value}
              className={styles.choice}
              onClick={() =>
                setWouldReturn(wouldReturn === value ? undefined : value)
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={id}>Anything else you want to share? (optional)</label>
      <textarea
        id={id}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={2000}
        rows={3}
        disabled={busy}
        aria-describedby={`${id}-limit`}
      />
      <span id={`${id}-limit`} className={styles.limit}>
        {comment.length.toLocaleString()} / 2,000 characters
      </span>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          className="practice-primary"
          type="submit"
          disabled={busy || (!liked && !wouldReturn && !comment.trim())}
        >
          {busy ? "Sending…" : "Send"}
        </button>
        <button
          className={styles.skip}
          type="button"
          disabled={busy}
          onClick={() => void submit(true)}
        >
          Skip
        </button>
      </div>
    </form>
  );
}
