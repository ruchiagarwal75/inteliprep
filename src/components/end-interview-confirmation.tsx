"use client";

import { InterviewDialog } from "@/components/interview-dialog";

export function EndInterviewConfirmation({
  open,
  draft,
  onCancel,
  onConfirm,
  switchTo,
}: {
  open: boolean;
  draft: string;
  onCancel: () => void;
  onConfirm: (includeDraft: boolean) => void;
  switchTo?: "new" | "problem";
}) {
  return (
    <InterviewDialog
      open={open}
      title={
        switchTo === "new"
          ? "End this interview and start a 45-minute interview?"
          : switchTo === "problem"
            ? "End this interview before changing problems?"
            : "End this interview?"
      }
      onClose={onCancel}
    >
      <p className="text-sm">
        This freezes your drawing and chat and generates your scorecard. You can
        reopen the results from Saved interviews.
        {switchTo &&
          " Your current interview ends before switching. If its scorecard fails, the saved interview keeps a retry option."}
      </p>
      {draft.trim() && (
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
          className="rounded border px-3 py-2 text-sm"
        >
          {switchTo ? "Stay in this interview" : "Keep interviewing"}
        </button>
        {draft.trim() && (
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className="bg-foreground text-background rounded px-3 py-2 text-sm"
          >
            {switchTo
              ? "Include answer, end, and continue"
              : "Include answer and end"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onConfirm(false)}
          className="rounded border border-red-400 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {switchTo
            ? draft.trim()
              ? "End without this answer and continue"
              : "End, save scorecard, and continue"
            : draft.trim()
              ? "End without this answer"
              : "End and generate scorecard"}
        </button>
      </div>
    </InterviewDialog>
  );
}
