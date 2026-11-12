"use client";
import Link from "next/link";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { roundViewSchema, submitRoundResultSchema } from "@/lib/play/public";
import type { DrillAnswer, RoundView, RoundSummary } from "@/lib/play/public";
import { peekRound, forgetRound } from "./round-prefetch";
import { usePlayRewards } from "./play-rewards";
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
  const { request, userId } = useCandidateAccount(),
    router = useRouter(),
    rewards = usePlayRewards(),
    [awardAnimation, setAwardAnimation] = useState<string>(),
    [initial] = useState(() => {
      const saved = peekRound(userId, sessionId);
      return saved?.question.courseKind ? saved : undefined;
    }),
    [view, setView] = useState<RoundView | undefined>(initial),
    [refreshed, setRefreshed] = useState(false),
    [retired, setRetired] = useState(false),
    [loadError, setLoadError] = useState(""),
    [submission, setSubmission] = useState<Submission>({ kind: "idle" }),
    [summary, setSummary] = useState<RoundSummary>(),
    locked = useRef(false),
    mounted = useRef(true),
    visited = useRef(new Map<string, boolean>());
  const load = useCallback(
    async (renewed = false) => {
      try {
        const response = await request(
            `/api/play/round?sessionId=${sessionId}`,
          ),
          data: unknown = await response.json();
        if (response.status === 410) {
          if (mounted.current) setRetired(true);
          return;
        }
        if (!response.ok) throw Error("Round unavailable");
        const parsed = roundViewSchema.parse(data);
        if (mounted.current) {
          const attemptId = parsed.question.attemptId;
          const resumed =
            visited.current.get(attemptId) ?? parsed.resumed ?? false;
          visited.current.set(attemptId, resumed);
          setView({ ...parsed, resumed });
          setLoadError("");
          if (renewed || parsed.refreshed) setRefreshed(true);
          if (parsed.status === "graded") router.refresh();
          return parsed;
        }
      } catch {
        if (mounted.current)
          setLoadError("Could not load your round. Please retry.");
      }
    },
    [request, sessionId, router],
  );
  const refresh = useCallback(() => void load(true), [load]);
  useEffect(() => {
    mounted.current = true;
    forgetRound(userId, sessionId);
    const timer = initial ? undefined : window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      mounted.current = false;
    };
  }, [load, initial, userId, sessionId]);
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
            revision: view.question.revision ?? 0,
            answer: value,
          }),
          signal: AbortSignal.timeout(40000),
        }),
        data: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          const latest = await load();
          if (
            latest &&
            (latest.question.attemptId !== view.question.attemptId ||
              (latest.question.revision ?? 0) !== (view.question.revision ?? 0))
          ) {
            if (mounted.current) {
              setSubmission({ kind: "idle" });
              setRefreshed(true);
            }
            return;
          }
        }
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
          combo: parsed.result.combo ?? 0,
          outcomes: (
            view.outcomes ??
            Array.from({ length: view.question.total }, () => null)
          ).map((previous, index) =>
            index === view.question.ordinal ? parsed.result.correct : previous,
          ),
          answer: value,
          result: parsed.result,
          summary: parsed.summary,
        });
        if (parsed.totals)
          rewards?.applyTotals(parsed.totals, parsed.result.correct);
        else router.refresh();
        if (parsed.result.correct) setAwardAnimation(view.question.attemptId);
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
  if (retired || (view && !view.question.courseKind))
    return (
      <section className="practice-surface">
        <h1>RAG is now a course</h1>
        <p>
          Your earlier progress is saved. Learn each topic, then take its quiz.
        </p>
        <Link className="practice-primary" href="/play/rag">
          Open RAG topics
        </Link>
      </section>
    );
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
      {loadError && <p role="alert">{loadError}</p>}
      {refreshed && (
        <p role="status">
          Your unanswered drills were refreshed. Your saved answers are kept.
        </p>
      )}
      <DrillCard
        key={`${view.question.attemptId}:${view.question.revision ?? 0}`}
        topic={topic}
        combo={view.combo ?? 0}
        question={view.question}
        resumed={view.resumed}
        outcomes={view.outcomes}
        animatePoints={awardAnimation === view.question.attemptId}
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
        onRefresh={refresh}
        onNext={() => void next()}
        onRetry={retry}
      />
    </>
  );
}
