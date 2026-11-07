import type { Scorecard } from "@/lib/scorecard";

export const MASCOT_TIMING = {
  delay: 800,
  wave: 7500,
  working: 3800,
  briefWorking: 15000,
  firstWorking: 7000,
  done: 4500,
  interval: 600_000,
  quiet: 5000,
  finalWindow: 120_000,
} as const;
export const MASCOT_SCHEDULE = { first: 600_000, repeat: 600_000 };
export const MASCOT_TEST_SCHEDULE = { first: 15_000, repeat: 45_000 };
export type MascotSchedule = typeof MASCOT_SCHEDULE;
function milestoneAt(activeMs: number, schedule: MascotSchedule) {
  return activeMs < schedule.first
    ? 0
    : 1 + Math.floor((activeMs - schedule.first) / schedule.repeat);
}
export type MascotClock = {
  activeMs: number;
  milestone: number;
  pending: boolean;
};

export function createMascotClock(
  activeMs = 0,
  schedule = MASCOT_SCHEDULE,
): MascotClock {
  const elapsed = Number.isFinite(activeMs) ? Math.max(0, activeMs) : 0;
  // A reload never replays moments whose scheduled time has already passed.
  return {
    activeMs: elapsed,
    milestone: milestoneAt(elapsed, schedule),
    pending: false,
  };
}
export function advanceMascotClock(
  clock: MascotClock,
  deltaMs: number,
  safety: { allowed: boolean; quietMs: number; remainingMs: number },
  schedule = MASCOT_SCHEDULE,
) {
  const activeMs = clock.activeMs + Math.max(0, deltaMs);
  const milestone = milestoneAt(activeMs, schedule);
  const pending =
    (clock.pending || milestone > clock.milestone) &&
    safety.remainingMs >= MASCOT_TIMING.finalWindow;
  const appear =
    pending && safety.allowed && safety.quietMs >= MASCOT_TIMING.quiet;
  return {
    clock: { activeMs, milestone, pending: pending && !appear },
    appear,
  };
}
export function restoredMascotTime(raw: string | null, elapsedMs: number) {
  try {
    const value: unknown = raw ? JSON.parse(raw) : undefined;
    if (
      value &&
      typeof value === "object" &&
      "activeMs" in value &&
      typeof value.activeMs === "number" &&
      Number.isFinite(value.activeMs) &&
      value.activeMs >= 0 &&
      value.activeMs <= elapsedMs
    )
      return value.activeMs;
  } catch {
    /* UI timing is optional, never a dependency of an interview. */
  }
  return Math.max(0, elapsedMs);
}
export function resultNeedsEncouragement(
  card: Pick<Scorecard, "signal" | "areas">,
): boolean {
  const scores = card.areas.flatMap((area) =>
    area.score === null ? [] : [area.score],
  );
  const average = scores.length
    ? scores.reduce((sum, n) => sum + n, 0) / scores.length
    : 0;
  return !(
    (card.signal === "yes" || card.signal === "strong_yes") &&
    average >= 2.5
  );
}

/** Preserve this decorative test flag when the existing workspace opens an interview. */
export function withMascotTest(href: string, search: string) {
  return new URLSearchParams(search).get("mascotTest") === "1"
    ? `${href}${href.includes("?") ? "&" : "?"}mascotTest=1`
    : href;
}
