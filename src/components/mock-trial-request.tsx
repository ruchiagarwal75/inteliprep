"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useMockTrials } from "./mock-trials-provider";
import locks from "./locked-mocks.module.css";

export function MockTrialRequest({ problemId }: { problemId: string }) {
  const { trials, update } = useMockTrials();
  const trial = trials.find((row) => row.problemId === problemId);
  const state = trial?.state ?? "not_requested";
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  async function submit() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await update(state === "not_requested" ? problemId : undefined);
    } catch {
      setError("Could not save or check your request. Please retry.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className={locks.request} data-trial-problem={problemId}>
      <p>Free to try during beta. Paid access planned after beta.</p>
      {state === "approved" ? (
        <>
          <p role="status">Approved for one trial interview.</p>
          <Link
            className="practice-primary"
            href={`/interview/new?problem=${problemId}`}
          >
            Start trial
          </Link>
        </>
      ) : state === "used" && trial?.state === "used" ? (
        <>
          <p role="status">Your trial has been used.</p>
          <Link
            className="practice-secondary"
            href={`/interview/${trial.sessionId}`}
          >
            Open interview
          </Link>
        </>
      ) : (
        <>
          {state === "requested" && (
            <p role="status">
              Access requested. We&apos;ll review it for beta.
            </p>
          )}
          {state === "revoked" && (
            <p role="status">
              Beta access is not available for this interview right now.
            </p>
          )}
          <button
            type="button"
            className="practice-secondary"
            disabled={pending}
            onClick={() => void submit()}
          >
            {pending
              ? "Checking..."
              : state === "not_requested"
                ? "Request beta access"
                : "Check access status"}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
