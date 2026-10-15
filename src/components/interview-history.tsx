"use client";

import { useState } from "react";
import type { SavedInterviewSummary } from "@/lib/saved-interview";
import {
  INTERVIEW_LEVEL_LABELS,
  type ProblemSummary,
} from "@/lib/interview-selection";
import { interviewHref } from "@/lib/interview-navigation";
import { formatInterviewTime } from "@/lib/interview-timer";
import { InterviewDialog } from "@/components/interview-dialog";
import { SIGNAL_LABELS } from "@/lib/scorecard";
import { InterviewHistoryList } from "@/components/interview-history-list";
import { historyInterviewState } from "@/lib/interview-history-state";
import { useHistoryClock } from "@/components/use-history-clock";

export function InterviewHistory({
  entries,
  problems,
  currentId,
  disabled,
  status,
  error,
  onOpen,
  onDelete,
  onRetrySave,
}: {
  entries: SavedInterviewSummary[];
  problems: ProblemSummary[];
  currentId?: string;
  disabled: boolean;
  status: string;
  error?: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRetrySave: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [confirmId, setConfirmId] = useState<string>();
  const now = useHistoryClock(visible);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span role="status" className="text-black/60 dark:text-white/60">
          {status}
        </span>
        {status === "Not saved" && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRetrySave}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Retry save
          </button>
        )}
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="rounded border px-2 py-1"
        >
          Saved interviews ({entries.length})
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <InterviewDialog
        open={visible}
        title="Saved interviews"
        onClose={() => setVisible(false)}
      >
        <p className="mb-3 text-xs text-black/60 dark:text-white/60">
          Newest interviews first. Stored in this browser profile. Interview
          links reopen saves in this browser; clearing site data removes them.
        </p>
        {entries.length === 0 && (
          <p>Start an interview to create your first save.</p>
        )}
        <InterviewHistoryList open={visible} count={entries.length}>
          {entries.map((entry) => {
            const state = historyInterviewState(entry, now);
            return (
              <li
                key={entry.id}
                className={`rounded-lg border p-3 ${currentId === entry.id ? "border-blue-500 bg-blue-500/5" : "border-black/15 dark:border-white/15"}`}
              >
                <p className="font-medium">
                  {problems.find(
                    (problem) => problem.problemId === entry.problemId,
                  )?.title ?? entry.problemId}{" "}
                  · {INTERVIEW_LEVEL_LABELS[entry.level]}
                  {currentId === entry.id && (
                    <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                      Open
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                  {new Date(entry.createdAt).toLocaleString()} ·{" "}
                  {state.elapsedSeconds === undefined
                    ? "Timing checked when opened"
                    : `${formatInterviewTime(state.elapsedSeconds)} used`}
                </p>
                <p className="mt-1 text-sm">
                  {entry.signal
                    ? SIGNAL_LABELS[entry.signal]
                    : entry.hasEnded
                      ? entry.gradingError
                        ? "Scorecard failed — retry available"
                        : "Awaiting scorecard"
                      : state.status === "expired"
                        ? "Time expired · Open to finish and generate a scorecard"
                        : state.status === "saved"
                          ? "Saved · Open to check session status"
                          : "In progress"}
                  {entry.averageScore !== undefined &&
                    ` · ${entry.averageScore.toFixed(1)}/4 assessed average`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={interviewHref(entry.id)}
                    aria-current={currentId === entry.id ? "page" : undefined}
                    aria-disabled={disabled}
                    onClick={(event) => {
                      if (disabled) {
                        event.preventDefault();
                        return;
                      }
                      if (
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      event.preventDefault();
                      onOpen(entry.id);
                      setVisible(false);
                    }}
                    className={`rounded border px-3 py-1 ${disabled ? "pointer-events-none opacity-40" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                  >
                    {state.status === "expired"
                      ? "Finish"
                      : entry.hasEnded
                        ? "View"
                        : "Resume"}
                  </a>
                  {confirmId === entry.id ? (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onDelete(entry.id);
                          setConfirmId(undefined);
                        }}
                        className="rounded border border-red-500 px-2 py-1 text-red-700 disabled:opacity-40 dark:text-red-300"
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(undefined)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setConfirmId(entry.id)}
                      className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-40 dark:border-red-700 dark:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </InterviewHistoryList>
      </InterviewDialog>
    </>
  );
}
