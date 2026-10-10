"use client";

import { useRef, useState } from "react";
import {
  INTERVIEW_LEVEL_LABELS,
  interviewLevelSchema,
  interviewStartSchema,
  type InterviewLevel,
  type InterviewStart,
  type ProblemSummary,
} from "@/lib/interview-selection";

type InterviewSetupProps = {
  problems: ProblemSummary[];
  interview?: InterviewStart;
  isReplying: boolean;
  onStart: (interview: InterviewStart) => void;
  onReset: () => void;
};

export function InterviewSetup({
  problems,
  interview,
  isReplying,
  onStart,
  onReset,
}: InterviewSetupProps) {
  const [problemId, setProblemId] = useState(problems[0]?.problemId ?? "");
  const [level, setLevel] = useState<InterviewLevel>("mid");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startingRef = useRef(false);
  const selected = problems.find((problem) => problem.problemId === problemId);

  async function start() {
    if (!selected || interview || startingRef.current) return;
    startingRef.current = true;
    setIsStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, level }),
      });
      if (!response.ok) {
        const detail = await response
          .json()
          .then((body) => (body as { error?: string }).error)
          .catch(() => null);
        throw new Error(
          detail ?? "Could not start the interview. Please try again.",
        );
      }
      const started = interviewStartSchema.safeParse(await response.json());
      if (!started.success)
        throw new Error("Could not start the interview. Please try again.");
      onStart(started.data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start the interview. Please try again.",
      );
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }

  return (
    <section
      aria-label="Interview setup"
      className="rounded-lg border border-black/10 px-4 py-3 dark:border-white/15"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">System design interview</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {selected?.summary ?? "No interview problems are available."}
          </p>
        </div>
        {interview && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
            Interview started
          </span>
        )}
      </div>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <label
          className="flex min-w-56 flex-1 flex-col gap-1 text-sm"
          htmlFor="interview-problem"
        >
          Problem
          <select
            id="interview-problem"
            value={problemId}
            disabled={Boolean(interview) || isStarting}
            onChange={(event) => setProblemId(event.target.value)}
            className="bg-background rounded-md border border-black/15 px-3 py-2 disabled:opacity-70 dark:border-white/20"
          >
            {problems.map((problem) => (
              <option key={problem.problemId} value={problem.problemId}>
                {problem.title}
              </option>
            ))}
          </select>
        </label>
        <label
          className="flex flex-col gap-1 text-sm"
          htmlFor="interview-level"
        >
          Difficulty
          <select
            id="interview-level"
            value={level}
            disabled={Boolean(interview) || isStarting}
            onChange={(event) =>
              setLevel(interviewLevelSchema.parse(event.target.value))
            }
            className="bg-background rounded-md border border-black/15 px-3 py-2 disabled:opacity-70 dark:border-white/20"
          >
            {selected?.levels.map((value) => (
              <option key={value} value={value}>
                {INTERVIEW_LEVEL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        {interview ? (
          <button
            type="button"
            disabled={isReplying || isStarting}
            onClick={onReset}
            className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/20"
          >
            New interview
          </button>
        ) : (
          <button
            type="submit"
            disabled={!selected || isStarting}
            className="bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-40"
          >
            {isStarting ? "Starting…" : "Start interview"}
          </button>
        )}
      </form>
      {interview && (
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          New interview resets the chat. Your drawing stays on the whiteboard.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
