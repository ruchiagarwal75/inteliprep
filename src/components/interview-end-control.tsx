"use client";

import { useState } from "react";
import { EndInterviewConfirmation } from "@/components/end-interview-confirmation";
import type { useInterviewEnd } from "@/components/use-interview-end";
import { finishBeforeSwitch } from "@/lib/interview-restart";
import type { InterviewStart } from "@/lib/interview-selection";

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
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  return (
    <>
      {interview && !ending.scorecard && (!timeExpired || hasEnded) && (
        <button
          type="button"
          onClick={() => (hasEnded ? void ending.end() : setConfirmEnd(true))}
          disabled={isStreaming || ending.isEnding || disabled}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/20"
        >
          {ending.isEnding
            ? "Generating scorecard…"
            : hasEnded || timeExpired
              ? "Retry scorecard"
              : "End interview"}
        </button>
      )}
      <EndInterviewConfirmation
        open={Boolean(leaveAction) || (confirmEnd && !timeExpired && !hasEnded)}
        switchTo={leaveAction}
        draft={draft}
        onCancel={() => {
          setConfirmEnd(false);
          onCancelLeave();
        }}
        onConfirm={(include) => {
          setConfirmEnd(false);
          const answer = include ? getDraft() : undefined;
          if (leaveAction) {
            onCancelLeave();
            void finishBeforeSwitch(() => ending.end(answer), onConfirmLeave);
          } else void ending.end(answer);
        }}
      />
    </>
  );
}
