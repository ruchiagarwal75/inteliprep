import type { InterviewPhase } from "@/lib/interview-phase";

export function InterviewStage({
  phase,
  ended,
}: {
  phase?: InterviewPhase;
  ended: boolean;
}) {
  return (
    <section
      aria-label="Interview stage"
      aria-live="polite"
      className="flex flex-wrap items-center gap-2 text-xs"
    >
      <span className="text-xs text-black/60 dark:text-white/60">
        {ended
          ? "Interview ended"
          : phase
            ? `Stage ${phase.position} of ${phase.total}`
            : "Interview stages"}
      </span>
      <span className="text-sm font-medium">
        {ended
          ? "Review your results below"
          : (phase?.title ?? "Start an interview to begin")}
      </span>
    </section>
  );
}
