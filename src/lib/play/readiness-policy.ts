import "server-only";
export type CareerLevel = "mid" | "senior" | "staff";
export type ReadinessState =
  "not_tested" | "gap" | "practice_ready" | "interview_ready";
export type ReadinessRecord = {
  state: ReadinessState;
  verifiedLevel: CareerLevel | null;
  lastActivityAt: string | null;
};
const rank = { mid: 0, senior: 1, staff: 2 };
export function currentReadiness(
  record: ReadinessRecord,
  now: Date,
): ReadinessState {
  if (
    record.state === "interview_ready" &&
    (!record.lastActivityAt ||
      now.getTime() - Date.parse(record.lastActivityAt) >= 21 * 86400000)
  )
    return "practice_ready";
  return record.state;
}
export function shownReadiness(
  record: ReadinessRecord,
  level: CareerLevel,
  now: Date,
): ReadinessState {
  const state = currentReadiness(record, now);
  return state === "interview_ready" &&
    (!record.verifiedLevel || rank[record.verifiedLevel] < rank[level])
    ? "practice_ready"
    : state;
}
export function afterDrill(
  record: ReadinessRecord,
  allLevelsPassed: boolean,
  now: Date,
): ReadinessRecord {
  const state = currentReadiness(record, now);
  return {
    ...record,
    state:
      state === "interview_ready"
        ? "interview_ready"
        : allLevelsPassed || state === "practice_ready"
          ? "practice_ready"
          : "gap",
    lastActivityAt: now.toISOString(),
  };
}
export function afterVerifiedMock(
  record: ReadinessRecord,
  level: CareerLevel,
  now: Date,
): ReadinessRecord {
  const previous = currentReadiness(record, now);
  const verifiedLevel =
    previous === "interview_ready" &&
    record.verifiedLevel &&
    rank[record.verifiedLevel] > rank[level]
      ? record.verifiedLevel
      : level;
  return {
    state: "interview_ready",
    verifiedLevel,
    lastActivityAt: now.toISOString(),
  };
}
