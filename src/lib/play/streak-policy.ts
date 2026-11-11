import "server-only";
export type StreakState = {
  current: number;
  longest: number;
  freezesAvailable: number;
  lastActiveDate: string | null;
  lastResolvedDate: string | null;
};
const dayMs = 86400000;
export function civilDay(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const ordinal = (day: string) => Date.parse(day + "T00:00:00Z") / dayMs;
const addDays = (day: string, days: number) =>
  new Date((ordinal(day) + days) * dayMs).toISOString().slice(0, 10);
/** Frozen days preserve the streak without adding practice days or weekly rewards. */
export function streakChange(
  state: StreakState,
  now: Date,
  timeZone: string,
  completed: boolean,
) {
  const next = { ...state },
    today = civilDay(now, timeZone),
    yesterday = addDays(today, -1),
    usedDates: string[] = [];
  let resolved = next.lastResolvedDate ?? next.lastActiveDate ?? yesterday;
  if (resolved < yesterday) {
    while (resolved < yesterday && next.current > 0) {
      resolved = addDays(resolved, 1);
      if (next.freezesAvailable > 0) {
        next.freezesAvailable--;
        usedDates.push(resolved);
      } else next.current = 0;
    }
    next.lastResolvedDate = yesterday;
  } else next.lastResolvedDate = resolved;
  let extended = false;
  if (completed && (!next.lastActiveDate || next.lastActiveDate < today)) {
    next.current++;
    next.longest = Math.max(next.longest, next.current);
    next.lastActiveDate = today;
    next.lastResolvedDate = today;
    extended = true;
    if (next.current % 7 === 0)
      next.freezesAvailable = Math.min(2, next.freezesAvailable + 1);
  }
  return { state: next, extended, usedDates, today };
}
