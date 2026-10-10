import type { CandidateAction } from "@/lib/candidate-actions";

const controls: { action: CandidateAction; label: string; message: string }[] =
  [
    {
      action: "draw",
      label: "Draw / pause questions",
      message: "I'd like time to work on my drawing. Please hold questions.",
    },
    {
      action: "explain",
      label: "Explain my drawing",
      message:
        "I'm ready to explain my drawing. Please let me finish before asking questions.",
    },
    {
      action: "review",
      label: "Discuss my design",
      message: "I've finished explaining. Let's discuss my design.",
    },
  ];

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
  return (
    <div className="border-t border-black/10 p-3 dark:border-white/15">
      <p
        className="mb-2 text-xs text-black/60 dark:text-white/60"
        aria-live="polite"
      >
        {current === "review"
          ? "Discussion is open. Pause questions whenever you want to draw more."
          : current === "explain"
            ? "Your turn to explain. Questions wait until you choose Discuss my design."
            : current === "draw"
              ? "Take your time drawing. Choose Explain my drawing when ready."
              : "Draw, then explain at your own pace. You choose when discussion begins."}
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Interview pace"
      >
        {controls.map((control) => (
          <button
            key={control.action}
            type="button"
            disabled={disabled || (control.action !== "draw" && !hasDrawing)}
            aria-pressed={current === control.action}
            onClick={() => onChoose(control.message, control.action)}
            className="rounded-md border border-black/15 px-2 py-1.5 text-xs disabled:opacity-40 aria-pressed:bg-black/10 dark:border-white/20 dark:aria-pressed:bg-white/10"
          >
            {control.label}
          </button>
        ))}
      </div>
    </div>
  );
}
