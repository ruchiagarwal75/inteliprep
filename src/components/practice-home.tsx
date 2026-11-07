"use client";
import { HomeMascot } from "@/components/mascot-moments";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import type { ProblemSummary } from "@/lib/interview-selection";
import { INTERVIEW_LEVEL_LABELS } from "@/lib/interview-selection";
import type { SavedInterviewSummary } from "@/lib/saved-interview";
import { historyInterviewState } from "@/lib/interview-history-state";
import { formatInterviewTime } from "@/lib/interview-timer";
import { interviewHref } from "@/lib/interview-navigation";
import { CandidateProfileMenu } from "@/components/candidate-profile-menu";
import { InterviewDialog } from "@/components/interview-dialog";
import { PracticeHero } from "@/components/practice-hero";
import { HouseIcon, PracticeIcon } from "@/components/practice-icons";
import {
  attemptCount,
  friendlySessionDate,
  sessionStatusCopy,
} from "@/lib/practice-session-copy";

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
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const title = (e: SavedInterviewSummary) =>
    problems.find((p) => p.problemId === e.problemId)?.title ?? e.problemId;
  const shown = showAll ? entries : entries.slice(0, 3);
  const href = (entry: SavedInterviewSummary) =>
    interviewHref(entry.id) +
    (entry.hasEnded || historyInterviewState(entry, now).status === "expired"
      ? "/results"
      : "");
  return (
    <main className="practice-page mascot-home-page">
      <div className="practice-shell">
        <header className="practice-nav">
          <Brand />
          <div className="practice-account-actions">
            <CandidateProfileMenu />
          </div>
        </header>
        <PracticeHero>
          <Link className="practice-primary" href="/interview/new">
            Start practice
            <PracticeIcon name="arrow" />
          </Link>
        </PracticeHero>
        <section
          id="practice-history"
          className="practice-surface"
          aria-label="Recent sessions"
        >
          <HomeMascot />
          <div className="section-heading">
            <div>
              <h2>Recent sessions</h2>
              {entries.length > 0 && (
                <p className="practice-muted">
                  {attemptCount(entries.length)} saved
                </p>
              )}
            </div>
            {entries.length > 3 && (
              <button
                type="button"
                className="practice-link"
                aria-expanded={showAll}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show latest 3" : "View all"}
              </button>
            )}
          </div>
          {error && (
            <p className="practice-error" role="alert">
              {error}
            </p>
          )}
          {!entries.length && (
            <div className="history-empty">
              <HouseIcon />
              <div>
                <p className="session-title">Your first session starts here.</p>
                <p className="practice-muted">
                  Choose a problem when you’re ready. We’ll save your place.
                </p>
              </div>
            </div>
          )}
          <ul className="session-list">
            {shown.map((e) => {
              const state = historyInterviewState(e, now);
              const status = sessionStatusCopy(e, state);
              return (
                <li key={e.id} className="session-item">
                  <div className="session-row">
                    <div className="session-main">
                      <p className="session-title">
                        <Link href={href(e)}>{title(e)}</Link>
                      </p>
                      <p className="session-meta">
                        <span>{INTERVIEW_LEVEL_LABELS[e.level]}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={e.createdAt}>
                          {friendlySessionDate(e.createdAt, now)}
                        </time>
                      </p>
                    </div>
                    <span className="session-duration">
                      <PracticeIcon name="clock" />
                      {state.elapsedSeconds === undefined ? (
                        "Not timed"
                      ) : (
                        <span
                          aria-label={`Elapsed duration ${formatInterviewTime(state.elapsedSeconds)}`}
                        >
                          {formatInterviewTime(state.elapsedSeconds)}
                        </span>
                      )}
                    </span>
                    <span
                      className={[
                        "status-chip",
                        status === "Completed" ? "" : "status-chip-warm",
                      ].join(" ")}
                    >
                      {status}
                    </span>
                    <Link className="session-open" href={href(e)}>
                      {e.hasEnded || state.status === "expired"
                        ? "View feedback"
                        : "Resume"}
                      <PracticeIcon name="chevron" />
                    </Link>
                    <button
                      type="button"
                      className="session-delete"
                      aria-label={`Delete ${title(e)} (${friendlySessionDate(e.createdAt, now)})`}
                      onClick={() => setConfirm(e)}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <p className="practice-note">
          Your practice history is saved in this browser.
        </p>
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
      </div>
    </main>
  );
}
