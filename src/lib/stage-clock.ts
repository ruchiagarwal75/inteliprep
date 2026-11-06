import type { InterviewTiming } from "@/lib/interview-timer";
export type StageClock = {
  timing: InterviewTiming;
  enteredAt: string;
  now?: number;
};
export const STAGE_TIMES = [
  { min: 3, max: 8 },
  { min: 0, max: Infinity },
  { min: 8, max: 15 },
  { min: 6, max: 12 },
  { min: 0, max: Infinity },
] as const;
export function stageTimeGate(
  index: number,
  complete: boolean,
  clock?: StageClock,
) {
  if (!clock || clock.timing.durationMinutes === 1)
    return { advance: complete, wrap: false };
  const now = clock.now ?? Date.now();
  const scale = clock.timing.durationMinutes / 45;
  const remaining = Date.parse(clock.timing.deadlineAt) - now;
  if (remaining <= 8 * 60_000 * scale) return { advance: false, wrap: true };
  if (index >= 3) return { advance: false, wrap: false };
  if (index === 1) return { advance: complete, wrap: false };
  const elapsed = Math.max(0, now - Date.parse(clock.enteredAt));
  const limits = STAGE_TIMES[index];
  return {
    advance:
      elapsed >= limits.min * 60_000 * scale &&
      (complete || elapsed >= limits.max * 60_000 * scale),
    wrap: false,
  };
}
