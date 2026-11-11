import type { InterviewPhase } from "@/lib/interview-phase";
import { interviewStageName } from "@/lib/interview-stage-names";

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
      <span className="text-muted text-xs">
        {ended
          ? "Interview ended"
          : phase
            ? `Stage ${phase.position} of ${phase.total}`
            : "Interview stages"}
      </span>
      <span className="text-sm font-medium">
        {ended
          ? "Review your results below"
          : phase
            ? interviewStageName(phase.position, phase.title)
            : "Start an interview to begin"}
      </span>
    </section>
  );
}
