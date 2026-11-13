import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { courseContentWarnings } from "./content-warnings.mjs";
import { courseTopic } from "./content";
import { courseDrills } from "./drills";
import { gradeDrill } from "../grade";
import { drillAnswerSchema } from "../public";
it("uses every supplied distractor and its specific explanation without changing the teaching contract", async () => {
  const topic = courseTopic(0);
  if (!topic) throw Error("Missing primer");
  const spec = readFileSync("docs/play-content/course-fixes-4.md", "utf8")
    .split("## 6.")[1]
    .split("## 7.")[0];
  for (const [index, q] of topic.questions.entries()) {
    const section = new RegExp(
      "\\nQ" + (index + 1) + "\\b[\\s\\S]*?(?=\\nQ\\d|\\nAlso add)",
    ).exec("\n" + spec)?.[0];
    if (!section) throw Error("Missing specified question");
    if (index === 6) {
      expect(q.options).toEqual(["12,000", "1,000", "1,012", "120,000"]);
      expect(q.ifWrong["1"]).toBe(
        "That's one per document, but search works on chunks.",
      );
      expect(q.ifWrong["2"]).toBe(
        "Multiply, don't add. Each of the 1,000 documents has 12 chunks.",
      );
      continue;
    }
    const choices = section
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2).split(" | ifWrong: "));
    expect(q.options.filter((_, i) => i !== q.correctIndex)).toEqual(
      choices.map(([text]) => text),
    );
    for (const [text, feedback] of choices) {
      const option = q.options.indexOf(text);
      expect(q.ifWrong[String(option)]).toBe(feedback);
      const drill = courseDrills.find(
        (d) => d.id === `rag-course-${q.id.toLowerCase()}`,
      );
      if (!drill) throw Error("Missing drill");
      expect(
        await gradeDrill(
          drill,
          { parameters: {}, order: [0, 1, 2, 3] },
          drillAnswerSchema.parse({
            type: "spot_flaw",
            option: String(option),
          }),
        ),
      ).toMatchObject({ correct: false, ifWrong: feedback });
    }
  }
});
it("warns only when a correct choice is uniquely longest in more than half the questions", () => {
  const long = { options: ["longest", "a", "b", "c"], correctIndex: 0 };
  const short = { options: ["a", "longest", "b", "c"], correctIndex: 0 };
  const tie = { options: ["longest", "longest", "b", "c"], correctIndex: 0 };
  expect(
    courseContentWarnings([{ level: 0, questions: [long, short] }]),
  ).toEqual([]);
  expect(courseContentWarnings([{ level: 0, questions: [long, tie] }])).toEqual(
    [],
  );
  expect(
    courseContentWarnings([{ level: 2, questions: [long, long, short] }]),
  ).toEqual(["Topic 2: the correct option is longest in 2 of 3 questions."]);
});
