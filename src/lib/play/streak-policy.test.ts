import { expect, it } from "vitest";
import { civilDay, streakChange } from "./streak-policy";
import type { StreakState } from "./streak-policy";
const empty: StreakState = {
  current: 0,
  longest: 0,
  freezesAvailable: 0,
  lastActiveDate: null,
  lastResolvedDate: null,
};
const at = (date: string) => new Date(date + "T12:00:00Z");
it("counts one completed drill per local calendar day, not per request", () => {
  const a = streakChange(empty, at("2026-11-01"), "UTC", true);
  expect(a.state.current).toBe(1);
  expect(streakChange(a.state, at("2026-11-01"), "UTC", true).extended).toBe(
    false,
  );
  expect(
    streakChange(a.state, at("2026-11-02"), "UTC", true).state.current,
  ).toBe(2);
  expect(
    streakChange(empty, at("2026-11-01"), "UTC", false).state.current,
  ).toBe(0);
});
it("uses the account time zone across midnight and daylight saving time", () => {
  const now = new Date("2026-11-11T07:00:00Z");
  expect(civilDay(now, "America/Los_Angeles")).toBe("2026-11-10");
  expect(civilDay(now, "Asia/Tokyo")).toBe("2026-11-11");
  const before = streakChange(
    empty,
    new Date("2026-03-08T09:59:00Z"),
    "America/Los_Angeles",
    true,
  );
  expect(
    streakChange(
      before.state,
      new Date("2026-03-08T10:01:00Z"),
      "America/Los_Angeles",
      true,
    ).extended,
  ).toBe(false);
});
it("grants one freeze per seven practice days and stores at most two", () => {
  let state = empty;
  for (let day = 1; day <= 21; day++)
    state = streakChange(
      state,
      at(`2026-11-${String(day).padStart(2, "0")}`),
      "UTC",
      true,
    ).state;
  expect(state).toMatchObject({
    current: 21,
    longest: 21,
    freezesAvailable: 2,
  });
  expect(
    streakChange(state, at("2026-11-21"), "UTC", true).state.freezesAvailable,
  ).toBe(2);
});
it("uses freezes once, does not extend on a freeze, and resets an uncovered gap", () => {
  const state: StreakState = {
    current: 7,
    longest: 7,
    freezesAvailable: 2,
    lastActiveDate: "2026-11-07",
    lastResolvedDate: "2026-11-07",
  };
  const frozen = streakChange(state, at("2026-11-10"), "UTC", false);
  expect(frozen.usedDates).toEqual(["2026-11-08", "2026-11-09"]);
  expect(frozen.state).toMatchObject({ current: 7, freezesAvailable: 0 });
  expect(
    streakChange(frozen.state, at("2026-11-10"), "UTC", false).usedDates,
  ).toEqual([]);
  expect(
    streakChange(frozen.state, at("2026-11-10"), "UTC", true).state.current,
  ).toBe(8);
  const broken = streakChange(
    { ...state, freezesAvailable: 1 },
    at("2026-11-10"),
    "UTC",
    true,
  );
  expect(broken.state).toMatchObject({
    current: 1,
    longest: 7,
    freezesAvailable: 0,
  });
});
