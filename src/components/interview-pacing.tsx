"use client";
import { useRef } from "react";
import {
  designDiscussionControl,
  type CandidateAction,
} from "@/lib/candidate-actions";
export function InterviewPacing({
  action,
  hasDrawing,
  hasExplanation = false,
  disabled,
  onChoose,
}: {
  action?: CandidateAction;
  hasDrawing: boolean;
  hasExplanation?: boolean;
  disabled: boolean;
  onChoose: (message: string, action: CandidateAction) => void;
}) {
  const changedAt = useRef(-Infinity);
  function choose(message: string, next: CandidateAction) {
    if (disabled || performance.now() - changedAt.current < 500) return;
    changedAt.current = performance.now();
    onChoose(message, next);
  }
  const draw = () =>
    choose(
      "I'd like time to work on my drawing. Please hold questions.",
      "draw",
    );
  const control = designDiscussionControl(action);
  const primary = action === "draw" || action === "explain";
  return (
    <div className="shrink-0 border-t p-3">
      <p className="text-sm" aria-live="polite">
        {action === "explain"
          ? "Explaining: interviewer is listening"
          : action === "draw"
            ? "Drawing: questions paused"
            : action === "review"
              ? "Answer the interviewer"
              : "Ask clarifying questions"}
      </p>
      <div
        className="mt-2 flex min-h-10 items-center gap-3"
        role="group"
        aria-label="Interview pace"
      >
        {primary && (
          <button
            type="button"
            disabled={
              disabled ||
              !hasDrawing ||
              (action === "explain" && !hasExplanation)
            }
            aria-describedby={
              !hasDrawing
                ? "explain-drawing-hint"
                : action === "explain" && !hasExplanation
                  ? "explain-message-hint"
                  : undefined
            }
            className="bg-brand text-brand-foreground rounded px-3 py-2 text-sm disabled:opacity-40"
            onClick={() => choose(control.message, control.action)}
          >
            {action === "draw" ? "Ready to explain" : "Done explaining"}
          </button>
        )}
        {action !== "draw" && (
          <button
            type="button"
            disabled={disabled}
            className="rounded px-1 py-2 text-sm underline disabled:opacity-40"
            onClick={draw}
          >
            {action === "explain"
              ? "Back to drawing"
              : action === "review"
                ? "Pause to draw"
                : "Start drawing"}
          </button>
        )}
      </div>
      <div className="mt-1 min-h-10 text-xs">
        {primary && !hasDrawing && (
          <p id="explain-drawing-hint" className="mt-1 text-xs">
            Draw at least one labeled component to start explaining.
          </p>
        )}
        {action === "explain" && !hasExplanation && (
          <p id="explain-message-hint" className="mt-1 text-xs">
            Send at least one message walking through your design before
            choosing Done explaining.
          </p>
        )}
      </div>
    </div>
  );
}
