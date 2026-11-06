"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProblemSummary } from "@/lib/interview-selection";
import type { SavedInterviewSummary } from "@/lib/saved-interview";
import { historyInterviewState } from "@/lib/interview-history-state";
import { formatInterviewTime } from "@/lib/interview-timer";
import { interviewHref } from "@/lib/interview-navigation";
import { CandidateSignOut } from "@/components/candidate-sign-out";
import { InterviewDialog } from "@/components/interview-dialog";
import { SIGNAL_LABELS } from "@/lib/scorecard";
export function PracticeHome({
  entries,
  problems,
  error,
  onDelete,
}: {
  entries: SavedInterviewSummary[];
  problems: ProblemSummary[];
  error?: string;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState<SavedInterviewSummary>();
  const [now] = useState(() => Date.now());
  const title = (e: SavedInterviewSummary) =>
    problems.find((p) => p.problemId === e.problemId)?.title ?? e.problemId;
  const resume = entries.find(
    (e) => historyInterviewState(e, now).status === "in_progress",
  );
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">InteliPrep</h1>
        <CandidateSignOut save={() => Promise.resolve()} />
      </header>
      <p>Practice a system design interview at your own pace.</p>
      <Link
        className="bg-foreground text-background inline-block rounded px-4 py-3"
        href="/interview/new"
      >
        Start practice
      </Link>
      {resume && (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Interview in progress</h2>
          <p>{title(resume)}</p>
          <Link
            className="mt-2 inline-block rounded border px-3 py-2"
            href={interviewHref(resume.id)}
          >
            Resume interview
          </Link>
        </section>
      )}
      <p className="text-sm">
        Practice history is stored in this browser. Signing out keeps it on this
        device.
      </p>
      {error && <p role="alert">{error}</p>}
      <section aria-label="Recent sessions">
        <h2 className="mb-3 text-lg font-semibold">Recent sessions</h2>
        {!entries.length && <p>No interviews yet.</p>}
        <ul className="space-y-3">
          {entries.map((e) => {
            const state = historyInterviewState(e, now);
            return (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <Link
                    className="font-medium underline"
                    href={interviewHref(e.id) + (e.hasEnded ? "/results" : "")}
                  >
                    {title(e)} · {e.level}
                  </Link>
                  <p className="mt-1 text-sm">
                    {new Date(e.createdAt).toLocaleString()} ·{" "}
                    {state.elapsedSeconds === undefined
                      ? "Saved"
                      : `${formatInterviewTime(state.elapsedSeconds)} used`}
                  </p>
                  <p className="text-sm">
                    {e.signal
                      ? SIGNAL_LABELS[e.signal]
                      : state.status === "expired"
                        ? "Time expired · Open to finish"
                        : e.hasEnded
                          ? "Ended"
                          : "In progress"}
                    {e.averageScore !== undefined
                      ? ` · ${e.averageScore.toFixed(1)}/4`
                      : ""}
                  </p>
                </div>
                <details className="relative shrink-0">
                  <summary
                    aria-label={`More actions for ${title(e)}`}
                    className="cursor-pointer rounded border px-3 py-1"
                  >
                    …
                  </summary>
                  <button
                    className="mt-2 rounded border border-red-500 px-3 py-1 text-red-700 dark:text-red-300"
                    onClick={() => setConfirm(e)}
                  >
                    Delete
                  </button>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
      <InterviewDialog
        open={Boolean(confirm)}
        title={
          confirm
            ? `Delete ${title(confirm)} (${new Date(confirm.createdAt).toLocaleString()})?`
            : "Delete interview?"
        }
        onClose={() => setConfirm(undefined)}
      >
        <button
          className="rounded border px-3 py-2"
          onClick={() => setConfirm(undefined)}
        >
          Keep interview
        </button>
        {confirm && (
          <button
            className="ml-3 rounded border border-red-500 px-3 py-2"
            onClick={() => {
              void onDelete(confirm.id);
              setConfirm(undefined);
            }}
          >
            Delete interview
          </button>
        )}
      </InterviewDialog>
    </main>
  );
}
