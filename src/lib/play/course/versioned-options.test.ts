import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { ragCourse } from "./content";
import { courseDrills } from "./drills";
import { createVariant, publicQuestion } from "../question";
import { gradeDrill } from "../grade";
import { drillAnswerSchema } from "../public";
import { gradeWrittenAnswer } from "../written-grader";
vi.mock("../written-grader", () => ({
  gradeWrittenAnswer: vi.fn(() => {
    throw Error("Static course grading must not call a model");
  }),
}));
const files = [
  "topic-1-questions-v2.md",
  "topic-2-v2.md",
  "topic-3-v2.md",
  "topic-4-v1.md",
  "topic-5-v1.md",
  "topic-6-v1.md",
  "topic-7-v1.md",
  "topic-8-v1.md",
  "topic-9-v1.md",
];
it.each(files)("preserves every question field verbatim in %s", (name) => {
  const source = readFileSync(`docs/play-content/rag-course/${name}`, "utf8");
  const level = Number(/^# Topic (\d):/u.exec(source)?.[1]);
  const topic = ragCourse.find((t) => t.level === level);
  if (!topic) throw Error("Missing topic");
  const sections = source.split(/^(?=T\d-Q\d+ · )/mu).slice(1);
  expect(topic.questions).toHaveLength(level === 1 ? 7 : 10);
  sections.forEach((section, index) => {
    const lines = section.split("\n").filter((line) => line.trim());
    const question = topic.questions[index];
    expect(question.id).toBe(lines[0].split(" · ")[0]);
    expect(question.title).toBe(
      lines[0].split(" · ")[1].replace(/ \((?:math|new|math, new)\)$/u, ""),
    );
    expect(question.prompt).toBe(lines[2]);
    expect(question.slide).toBe(Number(lines[1].slice(8)));
    expect(question.options).toEqual(
      lines.slice(3, 7).map((line) => line.replace(/^- (?:✓ )?/u, "")),
    );
    expect(question.correctIndex).toBe(
      lines.slice(3, 7).findIndex((line) => line.startsWith("- ✓ ")),
    );
    expect(question.keyIdea).toBe(lines[7].slice("Key idea: ".length));
    expect(question.why).toBe(lines[8].slice("Why: ".length));
    expect(
      Object.entries(question.ifWrong)
        .map(
          ([i, text]) => `If wrong (${question.options[Number(i)]}): ${text}`,
        )
        .sort(),
    ).toEqual(lines.slice(9).sort());
  });
  if (level > 1) {
    const slides = source
      .split("## Slides\n")[1]
      .split("## Questions\n")[0]
      .split(/^### S\d+\. /mu)
      .slice(1);
    expect(slides).toHaveLength(level === 2 ? 13 : 12);
    slides.forEach((raw, index) => {
      const lines = raw.split("\n");
      expect(topic.slides[index].title).toBe(lines[0]);
      const body = lines
        .slice(1)
        .filter((line) => !line.startsWith("Diagram:"))
        .map((line) => line.replace(/^(?:- |\d+\. )/u, ""))
        .join(" ")
        .replace(/\s+/gu, " ")
        .trim();
      const compiled = topic.slides[index].body
        .flatMap((block) =>
          block.kind === "paragraph" ? [block.text] : block.items,
        )
        .join(" ")
        .replace(/\s+/gu, " ")
        .trim();
      expect(compiled).toBe(body);
    });
  }
});
it("grades all 348 options through the static server path, including shuffled answers and specific feedback", async () => {
  const changed = courseDrills.filter((d) => d.level > 0);
  expect(changed).toHaveLength(87);
  let options = 0;
  for (const drill of changed) {
    if (drill.type !== "spot_flaw" || !drill.course)
      throw Error("Expected course choice");
    const variant = createVariant(drill),
      question = publicQuestion(
        drill,
        variant,
        {
          id: crypto.randomUUID(),
          ordinal: 0,
          startedAt: new Date().toISOString(),
        },
        10,
      );
    expect(JSON.stringify(question)).not.toMatch(
      /"(?:correctIndex|keyIdea|why|ifWrong|rubric|expected)":/u,
    );
    for (let position = 0; position < 4; position++) {
      const source = variant.order[position],
        correct = source === drill.correctIndex;
      const result = await gradeDrill(
        drill,
        variant,
        drillAnswerSchema.parse({
          type: "spot_flaw",
          option: String(position),
        }),
      );
      options++;
      expect(result).toMatchObject({
        correct,
        score: correct ? 1 : 0,
        expected: drill.options[drill.correctIndex],
        keyIdea: drill.course.keyIdea,
        why: drill.why,
      });
      expect(result.ifWrong).toBe(
        correct ? undefined : drill.course.ifWrong[String(source)],
      );
      if (!correct) expect(result.ifWrong).toBeTruthy();
    }
  }
  expect(options).toBe(348);
  expect(gradeWrittenAnswer).not.toHaveBeenCalled();
});
