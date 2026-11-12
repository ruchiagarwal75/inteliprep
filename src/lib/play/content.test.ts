import { expect, it } from "vitest";
import { drillsForTopic } from "./content";
import { calculateMath, chooseParameters, withinMathTolerance } from "./math";
import { publicQuestion, createVariant } from "./question";
const bank = drillsForTopic("rag");
it("installs eight authored drills per level with no sample content", () => {
  expect(new Set(bank.map((d) => d.id)).size).toBe(32);
  for (const level of [1, 2, 3, 4]) {
    const drills = bank.filter((d) => d.level === level);
    expect(drills).toHaveLength(8);
    for (const drill of drills) {
      expect(drill.sample).toBe(false);
      expect(drill.title).not.toContain("[sample]");
      expect(drill.prompt).not.toContain("[sample]");
    }
  }
  expect(new Set(bank.map((d) => d.type)).size).toBe(4);
});

it("all eight math examples and randomized parameters agree with the private formulas", () => {
  const math = bank.filter((d) => d.type === "math" && d.level === 2);
  expect(math).toHaveLength(8);
  for (const d of math) {
    if (d.type !== "math") throw Error("Wrong type");
    const example = d.math.example;
    if (!example) throw Error("Missing example");
    expect(calculateMath(d.math, example.parameters)).toBeCloseTo(
      example.answer,
      8,
    );
    for (let i = 0; i < 10; i++)
      expect(calculateMath(d.math, chooseParameters(d.math))).toBeGreaterThan(
        0,
      );
  }
  const nodes = math.find((d) => d.id === "rag-l2-08");
  if (!nodes || nodes.type !== "math") throw Error("Missing node template");
  expect(nodes.math.exactInteger).toBe(true);
  expect(withinMathTolerance(5.1, 5, true)).toBe(false);
});
it("randomized choice positions never expose the original correct option", () => {
  const d = bank.find((d) => d.type === "spot_flaw");
  if (!d) throw Error("Missing MC");
  const variant = createVariant(d),
    now = new Date().toISOString();
  const publicValue = JSON.stringify(
    publicQuestion(
      d,
      variant,
      { id: crypto.randomUUID(), ordinal: 0, startedAt: now },
      5,
    ),
  );
  expect(publicValue).not.toMatch(
    /correctIndex|seniorAnswer|rubric|expression|formula/,
  );
});
