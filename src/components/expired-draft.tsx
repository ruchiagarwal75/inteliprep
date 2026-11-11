export function ExpiredDraft({
  draft,
  busy,
  onInclude,
  onSkip,
}: {
  draft: string;
  busy: boolean;
  onInclude: () => void;
  onSkip: () => void;
}) {
  return (
    <section
      aria-label="Unsent answer at time limit"
      className="border-warning bg-warning-soft shrink-0 border-t p-3"
    >
      <p role="alert" className="text-sm font-medium">
        Time is up. Your unsent answer is preserved.
      </p>
      <p className="mt-1 text-xs">
        Include the text you already typed before generating the scorecard, or
        keep it as an unsubmitted draft.
      </p>
      <textarea
        aria-label="Saved final answer"
        readOnly
        value={draft}
        rows={3}
        className="bg-background mt-2 max-h-36 w-full rounded border p-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onInclude}
          className="bg-brand text-brand-foreground disabled:bg-accent-soft disabled:text-foreground rounded px-3 py-2 text-sm disabled:opacity-100"
        >
          Include final answer and score
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="disabled:bg-accent-soft disabled:text-foreground rounded border px-3 py-2 text-sm disabled:opacity-100"
        >
          Score without this answer
        </button>
      </div>
    </section>
  );
}
