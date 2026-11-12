/** Visible tabs renew a short server lease. A closed tab cannot accrue hours. */
export const DRILL_HEARTBEAT_MS = 10000;
export const DRILL_ACTIVE_LEASE_MS = 20000;
export const ROUND_STALE_MS = 2 * 60 * 60 * 1000;
export function activeDrillMs({
  elapsedMs,
  activeSince,
  now,
  maxTimeMs,
}: {
  elapsedMs: number;
  activeSince: number | null;
  now: number;
  maxTimeMs: number;
}) {
  return Math.min(
    maxTimeMs,
    Math.max(0, elapsedMs) +
      (activeSince === null
        ? 0
        : Math.min(DRILL_ACTIVE_LEASE_MS, Math.max(0, now - activeSince))),
  );
}
export function formatDrillTime(timeMs: number) {
  const seconds = Math.floor(Math.max(0, timeMs) / 1000);
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}m`
    : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
