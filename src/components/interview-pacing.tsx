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
    <div className="interview-pacing">
      <p id="pace-instruction" aria-live="polite">
        {action === "explain"
          ? hasExplanation
            ? "Explaining: the interviewer is listening"
            : "Explaining: send a message walking through your design before finishing."
          : action === "draw"
            ? hasDrawing
              ? "Drawing: questions paused"
              : "Drawing: add at least one labeled component to start explaining."
            : action === "review"
              ? "Discussion: answer the interviewer, or pause to draw."
              : "Ask clarifying questions, or start drawing."}
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
            aria-describedby="pace-instruction"
            className="practice-primary"
            onClick={() => choose(control.message, control.action)}
          >
            {action === "draw" ? "Ready to explain" : "Done explaining"}
          </button>
        )}
        {action !== "draw" && (
          <button
            type="button"
            disabled={disabled}
            className={
              action === "explain" ? "practice-secondary" : "practice-primary"
            }
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
    </div>
  );
}
