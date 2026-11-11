"use client";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { roundViewSchema, submitRoundResultSchema } from "@/lib/play/public";
import type { DrillAnswer, RoundView, RoundSummary } from "@/lib/play/public";
import { DrillCard } from "./drill-card";
import { RoundSummaryCard } from "./round-summary";
type Submission =
  | { kind: "idle" }
  | { kind: "checking"; answer: DrillAnswer }
  | { kind: "error"; answer: DrillAnswer; message: string };
export function DrillRunner({
  sessionId,
  topic,
}: {
  sessionId: string;
  topic: string;
}) {
  const { request } = useCandidateAccount(),
    router = useRouter(),
    [view, setView] = useState<RoundView>(),
    [loadError, setLoadError] = useState(""),
    [submission, setSubmission] = useState<Submission>({ kind: "idle" }),
    [summary, setSummary] = useState<RoundSummary>(),
    locked = useRef(false),
    mounted = useRef(true),
    refreshed = useRef<string>(undefined);
  const load = useCallback(async () => {
    try {
      const response = await request(`/api/play/round?sessionId=${sessionId}`),
        data: unknown = await response.json();
      if (!response.ok) throw Error("Round unavailable");
      const parsed = roundViewSchema.parse(data);
      if (mounted.current) {
        setView(parsed);
        setLoadError("");
      }
    } catch {
      if (mounted.current)
        setLoadError("Could not load your round. Please retry.");
    }
  }, [request, sessionId]);
  useEffect(() => {
    if (
      view?.status === "graded" &&
      refreshed.current !== view.question.attemptId
    ) {
      refreshed.current = view.question.attemptId;
      router.refresh();
    }
  }, [view, router]);
  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      mounted.current = false;
    };
  }, [load]);
  useEffect(() => {
    if (view?.status !== "grading") return;
    const timer = setInterval(() => void load(), 2500);
    return () => clearInterval(timer);
  }, [view?.status, load]);
  async function answer(value: DrillAnswer) {
    if (!view || locked.current) return;
    locked.current = true;
    setSubmission({ kind: "checking", answer: value });
    try {
      const response = await request("/api/play/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: view.question.attemptId,
            answer: value,
          }),
          signal: AbortSignal.timeout(40000),
        }),
        data: unknown = await response.json();
      if (!response.ok) {
        const failure = z
          .object({ error: z.string().max(400) })
          .safeParse(data);
        if (mounted.current)
          setSubmission({
            kind: "error",
            answer: value,
            message: failure.success
              ? failure.data.error
              : "Your answer is saved. Please retry grading.",
          });
        return;
      }
      const parsed = submitRoundResultSchema.parse(data);
      if (mounted.current) {
        setView({
          ...view,
          status: "graded",
          answer: value,
          result: parsed.result,
          summary: parsed.summary,
        });
        setSubmission({ kind: "idle" });
      }
    } catch {
      if (mounted.current)
        setSubmission({
          kind: "error",
          answer: value,
          message:
            "Your answer is saved. Grading is unavailable right now. Please retry.",
        });
    } finally {
      locked.current = false;
    }
  }
  async function next() {
    if (!view || locked.current) return;
    if (view.status === "graded" && view.summary) {
      setSummary(view.summary);
      return;
    }
    locked.current = true;
    try {
      const response = await request("/api/play/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          afterAttemptId: view.question.attemptId,
        }),
      });
      if (!response.ok) throw Error("Next unavailable");
      const data: unknown = await response.json();
      if (mounted.current) {
        setView(roundViewSchema.parse(data));
        setSubmission({ kind: "idle" });
      }
    } catch {
      if (mounted.current)
        setLoadError("Could not open the next drill. Please retry.");
    } finally {
      locked.current = false;
    }
  }
  if (summary) return <RoundSummaryCard summary={summary} />;
  if (!view)
    return (
      <section className="practice-surface" aria-live="polite">
        <h1>Practice round</h1>
        <p>{loadError || "Loading your drill..."}</p>
        {loadError && (
          <button className="practice-primary" onClick={() => void load()}>
            Retry
          </button>
        )}
      </section>
    );
  const retry =
    submission.kind === "error"
      ? () => void answer(submission.answer)
      : view.status === "grading"
        ? () => void answer(view.answer)
        : undefined;
  return (
    <>
      <Link className="practice-link" href={`/play/${topic}`}>
        Back to levels
      </Link>
      {loadError && <p role="alert">{loadError}</p>}
      <DrillCard
        key={view.question.attemptId}
        question={view.question}
        result={view.status === "graded" ? view.result : undefined}
        busy={submission.kind === "checking"}
        error={
          submission.kind === "error"
            ? submission.message
            : view.status === "grading"
              ? "Your saved answer is being checked."
              : undefined
        }
        onAnswer={(value) => void answer(value)}
        onNext={() => void next()}
        onRetry={retry}
      />
    </>
  );
}
