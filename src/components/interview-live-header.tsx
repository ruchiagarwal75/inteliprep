import { MascotToggle } from "@/components/mascot-preference";
import { Brand } from "@/components/brand";
import { CandidateProfileMenu } from "@/components/candidate-profile-menu";
import type { InterviewPhase } from "@/lib/interview-phase";
import {
  INTERVIEW_LEVEL_LABELS,
  type InterviewStart,
} from "@/lib/interview-selection";
import { InterviewStage } from "@/components/interview-stage";
import { InterviewTimer } from "@/components/interview-timer";
export function InterviewLiveHeader({
  title,
  interview,
  phase,
  ended,
  remainingSeconds,
  expired,
  status,
  error,
  setEndTarget,
  save,
}: {
  title?: string;
  interview?: InterviewStart;
  phase?: InterviewPhase;
  ended: boolean;
  remainingSeconds: number;
  expired: boolean;
  status: string;
  error?: string;
  setEndTarget: (node: HTMLDivElement | null) => void;
  save: () => Promise<void>;
}) {
  return (
    <header className="live-header grid shrink-0 grid-cols-[1fr_auto] items-center gap-2 rounded-lg border px-3 py-2 min-[900px]:grid-cols-3">
      <div className="flex min-w-0 items-center gap-3">
        <Brand compact small />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <p className="text-xs">
            {interview ? INTERVIEW_LEVEL_LABELS[interview.level] : ""}
          </p>
        </div>
      </div>
      {!ended && (
        <div className="order-3 col-span-2 text-center min-[900px]:order-none min-[900px]:col-span-1">
          <InterviewStage phase={phase} ended={false} />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 min-[900px]:col-start-3">
        {ended && <MascotToggle />}
        {!ended && interview?.timing && (
          <InterviewTimer
            remainingSeconds={remainingSeconds}
            ended={false}
            expired={expired}
            testMode={interview.timing.durationMinutes === 1}
          />
        )}
        {!ended && (
          <span role="status" className="text-xs" title={error ?? status}>
            {status === "Saved in this browser"
              ? "✓ Saved"
              : status === "Not saved"
                ? "Not saved"
                : "Saving…"}
          </span>
        )}
        <div ref={setEndTarget} />
        <CandidateProfileMenu compact save={save} />
      </div>
    </header>
  );
}
