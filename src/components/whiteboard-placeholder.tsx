/** Stands in for the Excalidraw canvas, which arrives with scene-to-text
 * (see docs/spec.md "Diagram understanding"). */
export function WhiteboardPlaceholder() {
  return (
    <section
      aria-label="Whiteboard"
      className="flex h-full items-center justify-center rounded-lg border border-dashed border-black/15 bg-black/[0.02] dark:border-white/20 dark:bg-white/[0.03]"
    >
      <p className="text-sm text-black/50 dark:text-white/50">
        Whiteboard goes here
      </p>
    </section>
  );
}
