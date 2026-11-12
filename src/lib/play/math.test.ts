import { expect, it } from "vitest";
import {
  parametersMatch,
  sameMathParameters,
  calculateMath,
  chooseParameters,
  fillNumbers,
  withinMathTolerance,
} from "./math";
import { mathFixture } from "./fixtures/drills";
it("checks both tolerance boundaries, zero, invalid numbers and exact node counts", () => {
  for (const value of [85, 100, 115])
    expect(withinMathTolerance(value, 100)).toBe(true);
  for (const value of [84.99, 115.01, -100, NaN, Infinity])
    expect(withinMathTolerance(value, 100)).toBe(false);
  expect(withinMathTolerance(0, 0)).toBe(true);
  expect(withinMathTolerance(0.1, 0)).toBe(false);
  expect(withinMathTolerance(5, 5, true)).toBe(true);
  expect(withinMathTolerance(4.8, 5, true)).toBe(false);
  expect(withinMathTolerance(4, 5, true)).toBe(false);
});
it("computes the provided vector example and generates valid parameters", () => {
  if (mathFixture.type !== "math") throw Error("Wrong fixture");
  const template = mathFixture.math;
  expect(
    calculateMath(template, { docs: 5000000, chunks: 10, dims: 768 }),
  ).toBeCloseTo(153.6);
  for (let i = 0; i < 30; i++) {
    const p = chooseParameters(template);
    expect(p.docs).toBeGreaterThanOrEqual(1000000);
    expect(p.docs).toBeLessThanOrEqual(20000000);
    expect(p.docs % 1000000).toBe(0);
    expect([384, 768, 1024, 1536]).toContain(p.dims);
  }
  expect(fillNumbers("{docs} documents", { docs: 5000000 })).toBe(
    "5,000,000 documents",
  );
  expect(() => fillNumbers("{missing}", {})).toThrow();
  expect(() =>
    calculateMath({ ...template, expression: [1, 0, "divide"] }, {}),
  ).toThrow();
});

it("rejects messy legacy inputs, off-grid decimals and missing values", () => {
  if (mathFixture.type !== "math") throw Error("Wrong fixture");
  const template = {
    ...mathFixture.math,
    parameters: {
      q: { kind: "range" as const, min: 10000, max: 2000000, step: 10000 },
      c: { kind: "range" as const, min: 0.2, max: 5, step: 0.1 },
    },
  };
  expect(parametersMatch(template, { q: 841167, c: 0.6 })).toBe(false);
  expect(parametersMatch(template, { q: 840000, c: 0.61 })).toBe(false);
  expect(
    sameMathParameters(template.parameters, {
      c: template.parameters.c,
      q: template.parameters.q,
    }),
  ).toBe(true);
  expect(parametersMatch(template, { q: 840000, c: 0.6 })).toBe(true);
  expect(parametersMatch(template, { q: 840000 })).toBe(false);
});
