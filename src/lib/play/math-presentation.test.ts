import { expect, it } from "vitest";
import {
  presentDrillResult,
  friendlyMathAnswer,
  workedMath,
  mathExplanation,
} from "./math-presentation";
import { mathDrills } from "./rag/scale-math";
import { calculateMath } from "./math";
it("uses at most three significant figures and friendly scales, retaining exact nodes", () => {
  expect(friendlyMathAnswer(7338.0438, "millions of tokens per day")).toBe(
    "about 7.34 billion tokens per day",
  );
  expect(friendlyMathAnswer(153.6, "GB")).toBe("about 154 GB");
  expect(friendlyMathAnswer(15360, "GB")).toBe("about 15.4 TB");
  expect(friendlyMathAnswer(1000000, "chunks per day")).toBe(
    "about 1 million chunks per day",
  );
  expect(friendlyMathAnswer(18000, "dollars per month")).toBe(
    "about 18 thousand dollars per month",
  );
  expect(friendlyMathAnswer(0.006, "cents per question")).toBe(
    "about 0.006 cents per question",
  );
  expect(friendlyMathAnswer(5, "nodes", true)).toBe("5 nodes");
});
it("shows the actual input numbers and arithmetic grouping, including old saved values", () => {
  const d = mathDrills.find((d) => d.id === "rag-l2-04");
  if (!d || d.type !== "math") throw Error("Missing template");
  const values = { q: 1358897, tin: 5000, tout: 400 },
    answer = friendlyMathAnswer(
      calculateMath(d.math, values),
      d.math.canonicalUnit,
    );
  expect(workedMath(d.math, values, answer)).toBe(
    "1,358,897 x (5,000 + 400) = about 7.34 billion tokens per day",
  );
  expect(mathExplanation(d.why, values)).not.toMatch(/\b(q|tin|tout)\b/);
});
it("every authored math example renders a numeric formula without variable names", () => {
  for (const d of mathDrills) {
    if (d.type !== "math" || !d.math.example)
      throw Error("Missing math example");
    const p = d.math.example.parameters,
      answer = friendlyMathAnswer(
        calculateMath(d.math, p),
        d.math.canonicalUnit,
        d.math.exactInteger,
      ),
      formula = workedMath(d.math, p, answer);
    for (const key of Object.keys(p))
      expect(formula.split(" = ")[0]).not.toMatch(new RegExp(`\\b${key}\\b`));
    expect(formula).toContain(" = ");
    expect(formula).toContain(answer);
  }
});

it("reformats old saved results without changing scores, time, XP or the original object", () => {
  const drill = mathDrills.find((d) => d.id === "rag-l2-04");
  if (!drill) throw Error("Missing template");
  const old = {
    correct: true,
    score: 1,
    points: 15,
    feedback: "That calculation checks out.",
    why: "q x (tin + tout)",
    formula: "q x (tin + tout)",
    expected: "7,338.0438 millions of tokens per day",
    timeMs: 12000,
    badgesEarned: [],
  };
  const before = structuredClone(old),
    result = presentDrillResult(
      drill,
      { parameters: { q: 1358897, tin: 5000, tout: 400 }, order: [0, 1, 2, 3] },
      old,
    );
  expect(result.expected).toBe("about 7.34 billion tokens per day");
  expect(result.formula).toContain("1,358,897 x (5,000 + 400)");
  expect(result).toMatchObject({
    correct: old.correct,
    score: old.score,
    points: old.points,
    timeMs: old.timeMs,
  });
  expect(old).toEqual(before);
});
