import { expect, it } from "vitest";
import { createVariant, publicQuestion } from "./question";
import { mathFixture, spotFixture, probeFixture } from "./fixtures/drills";
it("projects only visible question data and shuffles MC positions per attempt", () => {
  const positions = new Set<number>();
  for (let i = 0; i < 50; i++) {
    const variant = createVariant(spotFixture);
    positions.add(variant.order.indexOf(0));
    const q = publicQuestion(
      spotFixture,
      variant,
      {
        id: crypto.randomUUID(),
        ordinal: 0,
        startedAt: new Date().toISOString(),
      },
      5,
    );
    if (q.type !== "spot_flaw") throw Error("Wrong question type");
    expect(q.options.map((o) => o.id)).toEqual(["0", "1", "2", "3"]);
    expect(q.options[variant.order.indexOf(0)].text).toBe(
      "Preserve table headers",
    );
    expect(JSON.stringify(q)).not.toMatch(
      /correctIndex|rubric|seniorAnswer|expression|factor|order/u,
    );
  }
  expect(positions.size).toBeGreaterThan(1);
  const q = publicQuestion(
    mathFixture,
    createVariant(mathFixture),
    {
      id: crypto.randomUUID(),
      ordinal: 1,
      startedAt: new Date().toISOString(),
    },
    5,
  );
  expect(q.prompt).not.toContain("{docs}");
  expect(q).not.toHaveProperty("formula");
  expect(
    JSON.stringify(
      publicQuestion(
        probeFixture,
        createVariant(probeFixture),
        {
          id: crypto.randomUUID(),
          ordinal: 1,
          startedAt: new Date().toISOString(),
        },
        5,
      ),
    ),
  ).not.toContain("rubric");
});
