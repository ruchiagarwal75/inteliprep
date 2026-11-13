"use client";

import { ProblemTrackToggle } from "@/components/problem-track-toggle";
import { problemTrack, problemsInTrack } from "@/lib/problem-track";
import {
  INTERVIEW_LEVEL_LABELS,
  interviewLevelSchema,
  type InterviewStart,
  type ProblemSummary,
} from "@/lib/interview-selection";
import { interviewDurationSchema } from "@/lib/interview-timer";
import { InterviewDurationPicker } from "@/components/interview-duration-picker";
import type { InterviewChoice } from "@/components/use-interview-starter";

export function InterviewSetup({
  problems,
  interview,
  hasEnded,
  disabled,
  choice,
  onChoice,
  onStart,
  onNew,
  onChangeProblem,
  isStarting,
  error,
  hideStart = false,
}: {
  problems: ProblemSummary[];
  interview?: InterviewStart;
  hasEnded: boolean;
  disabled: boolean;
  choice: InterviewChoice;
  onChoice: (choice: InterviewChoice) => void;
  onStart: () => void;
  onNew: () => void;
  onChangeProblem: () => void;
  isStarting: boolean;
  error?: string;
  hideStart?: boolean;
}) {
  const selected = problems.find(
    (problem) =>
      problem.problemId === (interview?.problemId ?? choice.problemId),
  );
  return (
    <section
      aria-label="Interview setup"
      className="border-border shrink-0 rounded-lg border px-3 py-2"
    >
      {interview ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {selected?.title}
            </h1>
            <p className="text-muted text-xs">
              {INTERVIEW_LEVEL_LABELS[interview.level]} ·{" "}
              {interview.timing?.durationMinutes ?? 45}{" "}
              {interview.timing?.durationMinutes === 1 ? "minute" : "minutes"} ·{" "}
              {hasEnded ? "Ended" : "In progress"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || isStarting}
              onClick={onChangeProblem}
              className="disabled:bg-accent-soft disabled:text-foreground rounded border px-3 py-1.5 text-xs disabled:opacity-100"
            >
              Change problem
            </button>
            <button
              type="button"
              disabled={disabled || isStarting}
              onClick={onNew}
              className="bg-brand text-brand-foreground disabled:bg-accent-soft disabled:text-foreground rounded px-3 py-1.5 text-xs disabled:opacity-100"
            >
              {isStarting ? "Starting…" : "New 45-minute interview"}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          {new Set(problems.map(problemTrack)).size > 1 && (
            <ProblemTrackToggle
              value={problemTrack(selected)}
              disabled={disabled || isStarting}
              onChange={(track) => {
                const first = problemsInTrack(problems, track)[0];
                if (first) onChoice({ ...choice, problemId: first.problemId });
              }}
            />
          )}
          <label
            htmlFor="interview-problem"
            className="flex min-w-48 flex-1 flex-col gap-1 text-xs"
          >
            Problem
            <select
              id="interview-problem"
              value={choice.problemId}
              disabled={disabled || isStarting}
              onChange={(event) =>
                onChoice({ ...choice, problemId: event.target.value })
              }
              className="bg-background disabled:bg-accent-soft disabled:text-foreground rounded border px-2 py-2 text-sm disabled:opacity-100"
            >
              {problemsInTrack(problems, problemTrack(selected)).map(
                (problem) => (
                  <option key={problem.problemId} value={problem.problemId}>
                    {problem.title}
                  </option>
                ),
              )}
            </select>
          </label>
          <label
            htmlFor="interview-level"
            className="flex flex-col gap-1 text-xs"
          >
            Difficulty
            <select
              id="interview-level"
              value={choice.level}
              disabled={disabled || isStarting}
              onChange={(event) =>
                onChoice({
                  ...choice,
                  level: interviewLevelSchema.parse(event.target.value),
                })
              }
              className="bg-background disabled:bg-accent-soft disabled:text-foreground rounded border px-2 py-2 text-sm disabled:opacity-100"
            >
              {selected?.levels.map((level) => (
                <option key={level} value={level}>
                  {INTERVIEW_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </label>
          <InterviewDurationPicker
            value={choice.durationMinutes}
            disabled={disabled || isStarting}
            onChange={(value) =>
              onChoice({
                ...choice,
                durationMinutes: interviewDurationSchema.parse(Number(value)),
              })
            }
          />
          {!hideStart && (
            <button
              type="submit"
              disabled={!selected || disabled || isStarting}
              className="bg-brand text-brand-foreground disabled:bg-accent-soft disabled:text-foreground rounded px-4 py-2 text-sm disabled:opacity-100"
            >
              {isStarting ? "Starting…" : "Start interview"}
            </button>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="text-danger mt-2 text-xs">
          {error}
        </p>
      )}
    </section>
  );
}
