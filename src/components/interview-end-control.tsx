"use client";

import { useState } from "react";
import { EndInterviewConfirmation } from "@/components/end-interview-confirmation";
import type { useInterviewEnd } from "@/components/use-interview-end";
import { finishBeforeSwitch } from "@/lib/interview-restart";
import type { InterviewStart } from "@/lib/interview-selection";
import type { useInterviewClosure } from "@/components/use-interview-closure";

export function InterviewEndNotices({
  error,
  imageWarning,
}: Pick<ReturnType<typeof useInterviewEnd>, "error" | "imageWarning">) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
      {imageWarning && (
        <p
          role="status"
          className="px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          {imageWarning}
        </p>
      )}
    </>
  );
}

export function InterviewEndControl({
  interview,
  ending,
  hasEnded,
  timeExpired,
  disabled,
  isStreaming,
  draft,
  getDraft,
  leaveAction,
  onCancelLeave,
  onConfirmLeave,
  recoveryFailure,
  closure,
  remainingSeconds,
}: {
  interview?: InterviewStart;
  ending: ReturnType<typeof useInterviewEnd>;
  hasEnded: boolean;
  timeExpired: boolean;
  disabled: boolean;
  isStreaming: boolean;
  draft: string;
  getDraft: () => string;
  leaveAction?: "new" | "problem";
  onCancelLeave: () => void;
  onConfirmLeave: () => void;
  recoveryFailure: boolean;
  closure: ReturnType<typeof useInterviewClosure>;
  remainingSeconds?: number;
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  return (
    <>
      {interview &&
        !ending.scorecard &&
        !closure.closed &&
        (!hasEnded || recoveryFailure) &&
        (recoveryFailure || !timeExpired || hasEnded) && (
          <button
            type="button"
            onClick={() =>
              !recoveryFailure && hasEnded
                ? void ending.end()
                : setConfirmEnd(true)
            }
            disabled={
              isStreaming || ending.isEnding || closure.isClosing || disabled
            }
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/20"
          >
            {closure.isClosing
              ? "Saving interview…"
              : recoveryFailure
                ? "Close without scoring"
                : ending.isEnding
                  ? "Generating scorecard…"
                  : hasEnded || timeExpired
                    ? "Retry scorecard"
                    : "End interview"}
          </button>
        )}
      <EndInterviewConfirmation
        open={
          Boolean(leaveAction) ||
          (confirmEnd && (recoveryFailure || (!timeExpired && !hasEnded)))
        }
        withoutScoring={recoveryFailure}
        switchTo={leaveAction}
        draft={draft}
        remainingSeconds={remainingSeconds}
        durationMinutes={interview?.timing?.durationMinutes}
        onCancel={() => {
          setConfirmEnd(false);
          onCancelLeave();
        }}
        onConfirm={(include) => {
          setConfirmEnd(false);
          const answer = include ? getDraft() : undefined;
          const finish = () =>
            recoveryFailure ? closure.close() : ending.end(answer);
          if (leaveAction) {
            onCancelLeave();
            void finishBeforeSwitch(finish, onConfirmLeave);
          } else void finish();
        }}
      />
    </>
  );
}
