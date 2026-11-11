import { expect, it } from "vitest";
import {
  assertPrivatePlayAbsent,
  privatePlayStrings,
} from "../scripts/check-private-play.mjs";
it("rejects private Play content and formulas in a browser bundle", () => {
  expect(privatePlayStrings().length).toBeGreaterThan(20);
  expect(() =>
    assertPrivatePlayAbsent("public drill UI, answer form and result schemas"),
  ).not.toThrow();
  expect(() => assertPrivatePlayAbsent("private_rubric")).toThrow(
    /Private Play/,
  );
  expect(() =>
    assertPrivatePlayAbsent("ceil(raw x ov / (mem x 0.75))"),
  ).toThrow(/Private Play/);
});
