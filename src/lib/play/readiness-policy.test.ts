import { expect, it } from "vitest";
import {
  afterDrill,
  afterVerifiedMock,
  currentReadiness,
  shownReadiness,
} from "./readiness-policy";
import type { ReadinessRecord, ReadinessState } from "./readiness-policy";
const now = new Date("2026-11-11T12:00:00Z"),
  fresh: ReadinessRecord = {
    state: "not_tested",
    verifiedLevel: null,
    lastActivityAt: null,
  };
it("moves from not tested to gap and practice ready only after all levels pass", () => {
  expect(afterDrill(fresh, false, now).state).toBe("gap");
  expect(afterDrill(fresh, true, now).state).toBe("practice_ready");
  expect(afterDrill({ ...fresh, state: "gap" }, false, now).state).toBe("gap");
});
it("never creates interview ready from drills, even after prior readiness expires", () => {
  for (const state of [
    "not_tested",
    "gap",
    "practice_ready",
  ] satisfies ReadinessState[])
    for (const passed of [true, false])
      expect(afterDrill({ ...fresh, state }, passed, now).state).not.toBe(
        "interview_ready",
      );
  const old = {
    state: "interview_ready",
    verifiedLevel: "senior",
    lastActivityAt: "2026-10-21T12:00:00Z",
  } satisfies ReadinessRecord;
  expect(afterDrill(old, true, now).state).toBe("practice_ready");
  expect(
    currentReadiness(
      { ...old, lastActivityAt: "2026-10-21T12:00:00.001Z" },
      now,
    ),
  ).toBe("interview_ready");
  expect(currentReadiness(old, now)).toBe("practice_ready");
});
it("requires a fresh mock at the chosen bar and does not revive an expired higher bar", () => {
  const mid = afterVerifiedMock(fresh, "mid", now);
  expect(mid.state).toBe("interview_ready");
  expect(shownReadiness(mid, "senior", now)).toBe("practice_ready");
  expect(shownReadiness(mid, "mid", now)).toBe("interview_ready");
  const staff = afterVerifiedMock(fresh, "staff", now);
  expect(shownReadiness(staff, "senior", now)).toBe("interview_ready");
  expect(
    afterVerifiedMock(staff, "mid", new Date("2026-12-03T12:00:00Z"))
      .verifiedLevel,
  ).toBe("mid");
  expect(afterVerifiedMock(staff, "mid", now).verifiedLevel).toBe("staff");
});
it("treats unknown timing as not enough proof and preserves current readiness during real practice", () => {
  expect(
    currentReadiness(
      { ...fresh, state: "interview_ready", verifiedLevel: "senior" },
      now,
    ),
  ).toBe("practice_ready");
  const ready = afterVerifiedMock(fresh, "senior", now);
  expect(afterDrill(ready, false, new Date("2026-11-12T12:00:00Z")).state).toBe(
    "interview_ready",
  );
  expect(currentReadiness(ready, new Date("2026-12-02T12:00:00Z"))).toBe(
    "practice_ready",
  );
});
