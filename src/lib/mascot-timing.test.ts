import { describe, expect, it } from "vitest";
import {
  advanceMascotClock,
  createMascotClock,
  restoredMascotTime,
  resultNeedsEncouragement,
  MASCOT_TEST_SCHEDULE,
  withMascotTest,
} from "@/lib/mascot-timing";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";

const safe = { allowed: true, quietMs: 5000, remainingMs: 900_000 };
describe("the decorative interview clock", () => {
  it("appears at ten minutes, consumes that moment, and waits until twenty", () => {
    const before = advanceMascotClock(createMascotClock(), 599_999, safe);
    expect(before.appear).toBe(false);
    const first = advanceMascotClock(before.clock, 1, safe);
    expect(first.appear).toBe(true);
    const after = advanceMascotClock(first.clock, 599_999, safe);
    expect(after.appear).toBe(false);
    expect(advanceMascotClock(after.clock, 1, safe).appear).toBe(true);
  });
  it("does not advance during drawing pauses", () => {
    const paused = advanceMascotClock(createMascotClock(500_000), 0, {
      ...safe,
      allowed: false,
    });
    expect(paused.clock.activeMs).toBe(500_000);
    expect(paused.appear).toBe(false);
    expect(advanceMascotClock(paused.clock, 99_999, safe).appear).toBe(false);
  });
  it("defers while explaining, replying or interacting and requires five quiet seconds", () => {
    const due = advanceMascotClock(createMascotClock(), 600_000, {
      ...safe,
      allowed: false,
    });
    expect(due.appear).toBe(false);
    expect(due.clock.pending).toBe(true);
    const typing = advanceMascotClock(due.clock, 1000, {
      ...safe,
      quietMs: 4999,
    });
    expect(typing.appear).toBe(false);
    expect(advanceMascotClock(typing.clock, 1, safe).appear).toBe(true);
  });
  it("coalesces missed moments rather than showing a burst", () => {
    const busy = advanceMascotClock(createMascotClock(), 1_800_000, {
      ...safe,
      allowed: false,
    });
    const once = advanceMascotClock(busy.clock, 0, safe);
    expect(once.appear).toBe(true);
    expect(advanceMascotClock(once.clock, 0, safe).appear).toBe(false);
  });
  it("discards pending moments in the final two minutes", () => {
    const due = advanceMascotClock(createMascotClock(), 600_000, {
      ...safe,
      allowed: false,
    });
    const late = advanceMascotClock(due.clock, 0, {
      ...safe,
      remainingMs: 119_999,
    });
    expect(late.appear).toBe(false);
    expect(late.clock.pending).toBe(false);
    expect(
      advanceMascotClock(createMascotClock(), 600_000, {
        ...safe,
        remainingMs: 120_000,
      }).appear,
    ).toBe(true);
  });
  it("retains the UI clock through refresh without replaying a past appearance", () => {
    const saved = restoredMascotTime('{"activeMs":670000}', 900_000);
    expect(saved).toBe(670_000);
    const clock = createMascotClock(saved);
    expect(advanceMascotClock(clock, 0, safe).appear).toBe(false);
    expect(advanceMascotClock(clock, 530_000, safe).appear).toBe(true);
  });
  it.each([
    null,
    "bad json",
    "null",
    "{}",
    '{"activeMs":-1}',
    '{"activeMs":900001}',
  ])("ignores invalid or impossible UI storage: %s", (raw) => {
    expect(restoredMascotTime(raw, 900_000)).toBe(900_000);
  });
});
describe("result tone", () => {
  it("celebrates a supported positive result", () => {
    expect(resultNeedsEncouragement(scorecardFixture())).toBe(false);
  });
  it.each(["no", "strong_no", "insufficient_evidence"] as const)(
    "uses encouragement, without celebration, for %s",
    (signal) => {
      expect(resultNeedsEncouragement({ ...scorecardFixture(), signal })).toBe(
        true,
      );
    },
  );
  it("does not celebrate low or missing area scores", () => {
    const card = scorecardFixture();
    expect(
      resultNeedsEncouragement({
        ...card,
        areas: card.areas.map((area) => ({ ...area, score: 1 })),
      }),
    ).toBe(true);
    expect(
      resultNeedsEncouragement({
        ...card,
        areas: card.areas.map((area) => ({ ...area, score: null })),
      }),
    ).toBe(true);
  });
});

it("uses 15 seconds, then 45 seconds between test visits", () => {
  const before = advanceMascotClock(
    createMascotClock(0, MASCOT_TEST_SCHEDULE),
    14999,
    safe,
    MASCOT_TEST_SCHEDULE,
  );
  expect(before.appear).toBe(false);
  const first = advanceMascotClock(before.clock, 1, safe, MASCOT_TEST_SCHEDULE);
  expect(first.appear).toBe(true);
  const waiting = advanceMascotClock(
    first.clock,
    44999,
    safe,
    MASCOT_TEST_SCHEDULE,
  );
  expect(waiting.appear).toBe(false);
  expect(
    advanceMascotClock(waiting.clock, 1, safe, MASCOT_TEST_SCHEDULE).appear,
  ).toBe(true);
});
it("keeps a due test visit pending across repeated unsafe checks", () => {
  let clock = createMascotClock(0, MASCOT_TEST_SCHEDULE);
  for (let i = 0; i < 6; i++) {
    const next = advanceMascotClock(
      clock,
      5000,
      { ...safe, allowed: false },
      MASCOT_TEST_SCHEDULE,
    );
    expect(next.appear).toBe(false);
    clock = next.clock;
  }
  expect(clock.activeMs).toBe(30000);
  expect(clock.pending).toBe(true);
  expect(
    advanceMascotClock(clock, 5000, safe, MASCOT_TEST_SCHEDULE).appear,
  ).toBe(true);
});
it("preserves the mascot test flag without changing normal navigation", () => {
  expect(withMascotTest("/interview/abc", "?mascotTest=1")).toBe(
    "/interview/abc?mascotTest=1",
  );
  expect(withMascotTest("/interview/abc", "?mascotTest=0")).toBe(
    "/interview/abc",
  );
  expect(withMascotTest("/interview/abc", "")).toBe("/interview/abc");
});
