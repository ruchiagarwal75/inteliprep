"use client";

import { InterviewDialog } from "@/components/interview-dialog";

export function EndInterviewConfirmation({
  open,
  draft,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  draft: string;
  onCancel: () => void;
  onConfirm: (includeDraft: boolean) => void;
}) {
  return (
    <InterviewDialog open={open} title="End this interview?" onClose={onCancel}>
      <p className="text-sm">
        This freezes your drawing and chat and generates your scorecard. You can
        reopen the results from Saved interviews.
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
          Keep interviewing
        </button>
        {draft.trim() && (
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className="bg-foreground text-background rounded px-3 py-2 text-sm"
          >
            Include answer and end
          </button>
        )}
        <button
          type="button"
          onClick={() => onConfirm(false)}
          className="rounded border border-red-400 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {draft.trim()
            ? "End without this answer"
            : "End and generate scorecard"}
        </button>
      </div>
    </InterviewDialog>
  );
}
