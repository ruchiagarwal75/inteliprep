import { expect, it } from "vitest";
import {
  activeDrillMs,
  formatDrillTime,
  DRILL_ACTIVE_LEASE_MS,
} from "./drill-time";
it("counts visible intervals, stops when paused, and bounds an unclosed tab lease", () => {
  expect(
    activeDrillMs({
      elapsedMs: 5000,
      activeSince: 1000,
      now: 6000,
      maxTimeMs: 270000,
    }),
  ).toBe(10000);
  expect(
    activeDrillMs({
      elapsedMs: 5000,
      activeSince: null,
      now: 5 * 3600000,
      maxTimeMs: 270000,
    }),
  ).toBe(5000);
  expect(
    activeDrillMs({
      elapsedMs: 5000,
      activeSince: 1000,
      now: 5 * 3600000,
      maxTimeMs: 270000,
    }),
  ).toBe(5000 + DRILL_ACTIVE_LEASE_MS);
  expect(
    activeDrillMs({
      elapsedMs: 269999,
      activeSince: 1000,
      now: 5000,
      maxTimeMs: 270000,
    }),
  ).toBe(270000);
});
it("uses hours and minutes for long legacy results instead of three-digit minutes", () => {
  expect(formatDrillTime(314 * 60000 + 53000)).toBe("5h 14m");
  expect(formatDrillTime(3599000)).toBe("59:59");
  expect(formatDrillTime(3600000)).toBe("1h 00m");
  expect(formatDrillTime(-1)).toBe("00:00");
});
