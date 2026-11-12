import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drillsForTopic } from "./content";
import { createVariant, publicQuestion } from "./question";
import { gradeDrill } from "./grade";
const source = readFileSync("docs/play-content/rag-levels-3-4.md", "utf8");
const bank = drillsForTopic("rag").filter((d) => d.level >= 3);
it("keeps all 16 authored designs, options and private written criteria intact", () => {
  const blocks = [
    ...source.matchAll(
      /^L([34])-(\d{2}) \| [^\n]+\n([\s\S]*?)(?=^L[34]-\d{2} \||^## Level |(?![\s\S]))/gm,
    ),
  ];
  expect(blocks).toHaveLength(16);
  expect(bank).toHaveLength(16);
  for (const block of blocks) {
    const id = `rag-l${block[1]}-${block[2]}`,
      drill = bank.find((d) => d.id === id),
      body = block[3];
    if (!drill) throw Error("Missing authored drill " + id);
    expect(drill.sample).toBe(false);
    expect(drill.placement).toBe(drill.level === 3 && Number(block[2]) <= 2);
    if (drill.type === "spot_flaw") {
      const design = body.match(/^Design: (.+)$/m)?.[1];
      expect(drill.prompt).toBe(design);
      for (const [index, letter] of [..."ABCD"].entries())
        expect(drill.options[index]).toBe(
          body.match(new RegExp("^" + letter + "\\) (.+)$", "m"))?.[1],
        );
      expect(drill.correctIndex).toBe(0);
      expect(drill.why).toBe(body.match(/^Why: (.+)$/m)?.[1]);
    } else if (drill.type === "pick_probe" || drill.type === "tradeoff") {
      expect(body).toContain(drill.rubric);
      expect(body).toContain(drill.seniorAnswer);
      for (const part of drill.prompt.split("\n\n"))
        expect(body).toContain(part);
    } else throw Error("Unexpected drill type");
  }
});
it("grades shuffled options on the server and omits answers, why and rubrics before submission", async () => {
  for (const drill of bank) {
    const variant = createVariant(drill),
      question = publicQuestion(
        drill,
        variant,
        {
          id: crypto.randomUUID(),
          ordinal: 0,
          startedAt: new Date().toISOString(),
        },
        5,
      ),
      serialized = JSON.stringify(question);
    expect(serialized).not.toMatch(/correctIndex|rubric|seniorAnswer|"why"/u);
    if (drill.type === "spot_flaw") {
      for (const [index, id] of ["0", "1", "2", "3"].entries()) {
        const option =
          question.type === "spot_flaw"
            ? question.options[index]?.id
            : undefined;
        if (!option) throw Error("Missing option " + id);
        const grade = await gradeDrill(drill, variant, {
          type: "spot_flaw",
          option,
        });
        expect(grade.correct).toBe(variant.order[index] === drill.correctIndex);
      }
    }
  }
});

it("keeps every generated L2 input on the authored grid, including questions in steps of 10000", async () => {
  const { mathDrills } = await import("./rag/scale-math");
  const { chooseParameters, parametersMatch } = await import("./math");
  for (const drill of mathDrills) {
    if (drill.type !== "math") throw Error("Expected math");
    if (drill.math.parameters.q)
      expect(drill.math.parameters.q).toMatchObject({
        kind: "range",
        step: 10000,
      });
    for (let i = 0; i < 20; i++)
      expect(parametersMatch(drill.math, chooseParameters(drill.math))).toBe(
        true,
      );
  }
});
