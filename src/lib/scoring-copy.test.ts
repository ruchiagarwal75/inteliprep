import { expect, it } from "vitest";
import {
  durationInWords,
  elapsedInWords,
  scoringMinimumInWords,
} from "@/lib/scoring-copy";
it("uses plain durations for both normal lengths and the development test", () => {
  expect(scoringMinimumInWords(45)).toBe("15 minutes");
  expect(scoringMinimumInWords(60)).toBe("20 minutes");
  expect(scoringMinimumInWords(1)).toBe("20 seconds");
  expect(elapsedInWords(159)).toBe("2 minutes");
  expect(elapsedInWords(27)).toBe("less than a minute");
  expect(durationInWords(60)).toBe("1 minute");
});
