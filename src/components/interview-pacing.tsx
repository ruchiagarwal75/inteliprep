import {
  designDiscussionControl,
  type CandidateAction,
} from "@/lib/candidate-actions";

export function InterviewPacing({
  action,
  hasDrawing,
  disabled,
  onChoose,
}: {
  action?: CandidateAction;
  hasDrawing: boolean;
  disabled: boolean;
  onChoose: (message: string, action: CandidateAction) => void;
}) {
  const current = action ?? (hasDrawing ? "draw" : undefined);
  const designControl = designDiscussionControl(current);
  return (
    <div className="border-t border-black/10 p-3 dark:border-white/15">
      <p
        className="mb-2 text-xs text-black/60 dark:text-white/60"
        aria-live="polite"
      >
        {current === "review"
          ? "Discussion is open. Pause to draw or explain an update whenever you need."
          : current === "explain"
            ? "Explain across as many messages as you need. Choose Done explaining when you're ready for questions."
            : current === "draw"
              ? "Take your time drawing. Choose Explain my design when ready."
              : "Draw, then explain at your own pace. You choose when discussion begins."}
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Interview pace"
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={current === "draw"}
          onClick={() =>
            onChoose(
              "I'd like time to work on my drawing. Please hold questions.",
              "draw",
            )
          }
          className="rounded-md border border-black/15 px-2 py-1.5 text-xs disabled:opacity-40 aria-pressed:bg-black/10 dark:border-white/20 dark:aria-pressed:bg-white/10"
        >
          Draw / pause questions
        </button>
        <button
          type="button"
          disabled={disabled || !hasDrawing}
          onClick={() => onChoose(designControl.message, designControl.action)}
          className="rounded-md border border-black/15 px-2 py-1.5 text-xs disabled:opacity-40 dark:border-white/20"
        >
          {designControl.label}
        </button>
      </div>
    </div>
  );
}
