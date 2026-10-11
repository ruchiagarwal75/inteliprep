import type { InterviewPhase } from "@/lib/interview-phase";

export function InterviewStage({ phase }: { phase?: InterviewPhase }) {
  return (
    <section
      aria-label="Interview stage"
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-2 dark:border-white/15"
    >
      <span className="text-xs text-black/60 dark:text-white/60">
        {phase
          ? `Stage ${phase.position} of ${phase.total}`
          : "Interview stages"}
      </span>
      <span className="text-sm font-medium">
        {phase?.title ?? "Start an interview to begin"}
      </span>
    </section>
  );
}
