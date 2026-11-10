"use client";

import {
  elapsedInWords,
  scoringMinimumInWords,
  DESIGN_EXPLANATION_RULE,
} from "@/lib/scoring-copy";
import { InterviewDialog } from "@/components/interview-dialog";
import { type InterviewDuration } from "@/lib/interview-timer";
import { scoringEligibility } from "@/lib/scoring-eligibility";

export function EndInterviewConfirmation({
  open,
  draft,
  onCancel,
  onConfirm,
  switchTo,
  withoutScoring = false,
  remainingSeconds,
  durationMinutes,
}: {
  open: boolean;
  draft: string;
  onCancel: () => void;
  onConfirm: (includeDraft: boolean) => void;
  switchTo?: "new" | "problem";
  withoutScoring?: boolean;
  remainingSeconds?: number;
  durationMinutes?: InterviewDuration;
}) {
  const elapsed =
    durationMinutes !== undefined && remainingSeconds !== undefined
      ? Math.max(0, durationMinutes * 60 - remainingSeconds)
      : undefined;
  const gate =
    durationMinutes !== undefined && elapsed !== undefined
      ? scoringEligibility(durationMinutes, elapsed)
      : undefined;
  const early = !withoutScoring && gate && !gate.timeReady;
  return (
    <InterviewDialog
      open={open}
      title={
        withoutScoring
          ? "Close this interview without scoring?"
          : switchTo === "new"
            ? "End this interview and start a 45-minute interview?"
            : switchTo === "problem"
              ? "End this interview before changing problems?"
              : "End this interview?"
      }
      onClose={onCancel}
    >
      {early && elapsed !== undefined && (
        <p role="note" className="scorecard-note">
          You&apos;re {elapsedInWords(elapsed)} in. Interviews need at least{" "}
          {scoringMinimumInWords(durationMinutes ?? 45)} to get a score.{" "}
          {DESIGN_EXPLANATION_RULE} End anyway?
        </p>
      )}
      {remainingSeconds !== undefined && remainingSeconds > 0 && (
        <p className="practice-muted">
          You still have {Math.ceil(remainingSeconds / 60)}{" "}
          {Math.ceil(remainingSeconds / 60) === 1 ? "minute" : "minutes"}.
        </p>
      )}
      {draft.trim() && !withoutScoring && (
        <>
          <p className="mt-3 text-sm font-medium">
            You have an unsent answer. Choose whether to include it in your
            assessment.
          </p>
          <pre className="mt-2 max-h-48 overflow-y-auto rounded bg-black/5 p-3 text-sm whitespace-pre-wrap dark:bg-white/10">
            {draft}
          </pre>
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={early ? "practice-primary" : "practice-secondary"}
        >
          Keep going
        </button>
        {draft.trim() && !withoutScoring && (
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className={early ? "practice-secondary" : "practice-primary"}
          >
            {switchTo
              ? "Include answer, end, and continue"
              : "Include answer and end"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onConfirm(false)}
          className={
            early || (draft.trim() && !withoutScoring)
              ? "practice-secondary"
              : "practice-primary"
          }
        >
          {withoutScoring
            ? switchTo
              ? "Close without scoring and continue"
              : "Close without scoring"
            : switchTo
              ? draft.trim()
                ? "End without this answer and continue"
                : "End, save scorecard, and continue"
              : draft.trim()
                ? "End without this answer"
                : "End interview"}
        </button>
      </div>
    </InterviewDialog>
  );
}
