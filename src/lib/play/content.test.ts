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

it("uses round inputs across every math template, not arbitrary integer document or query counts", () => {
  const steps: Record<string, number> = {
    docs: 1000000,
    q: 10000,
    n: 10000000,
    tin: 500,
    tout: 100,
    raw: 20,
  };
  for (const drill of bank) {
    if (drill.type !== "math") continue;
    for (const [name, parameter] of Object.entries(drill.math.parameters)) {
      if (parameter.kind !== "range" || !(name in steps)) continue;
      expect(parameter.step, `${drill.id}: ${name}`).toBe(steps[name]);
    }
    for (let index = 0; index < 100; index++) {
      const parameters = chooseParameters(drill.math);
      for (const [name, value] of Object.entries(parameters)) {
        const parameter = drill.math.parameters[name];
        if (parameter.kind === "choices") {
          expect(parameter.values).toContain(value);
          continue;
        }
        expect(value).toBeGreaterThanOrEqual(parameter.min);
        expect(value).toBeLessThanOrEqual(parameter.max);
        expect((value - parameter.min) / parameter.step).toBeCloseTo(
          Math.round((value - parameter.min) / parameter.step),
          7,
        );
      }
    }
  }
});
