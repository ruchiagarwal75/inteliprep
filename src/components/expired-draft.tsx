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
      className="shrink-0 border-t border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
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
          className="bg-foreground text-background rounded px-3 py-2 text-sm disabled:opacity-40"
        >
          Include final answer and score
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="rounded border px-3 py-2 text-sm disabled:opacity-40"
        >
          Score without this answer
        </button>
      </div>
    </section>
  );
}
