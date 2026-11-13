import { parseCourseChoices } from "./parse.mjs";
import { parseCourseSlidesMarkdown } from "./parse-slides.mjs";

/** Strict authored format. Metadata is private; no teaching prose is generated. */
export function parseVersionedQuestions(
  markdown,
  { level, slideCount, questionCount },
) {
  if (!markdown.startsWith(`# Topic ${level}: `))
    throw Error("Wrong topic header");
  const sections = markdown.split(/^(?=T\d+-Q\d+ · )/mu).slice(1);
  if (sections.length !== questionCount) throw Error("Wrong question count");
  return sections.map((section, index) => {
    const rows = section.split("\n").filter((line) => line.trim());
    const heading = /^(T\d+-Q\d+) · (.+?)(?: \((math|new|math, new)\))?$/u.exec(
      rows[0],
    );
    const reference = /^Slide: S([1-9]\d*)$/u.exec(rows[1]);
    if (!heading || heading[1] !== `T${level}-Q${index + 1}`)
      throw Error("Questions must keep sequential topic IDs");
    if (!reference || Number(reference[1]) > slideCount)
      throw Error("Question slide reference is out of range");
    if (
      rows.length !== 12 ||
      !rows[2] ||
      /^(?:Slide:|- |Key idea:|Why:|If wrong)/u.test(rows[2]) ||
      !rows.slice(3, 7).every((line) => line.startsWith("- ")) ||
      !rows[7].startsWith("Key idea: ") ||
      !rows[8].startsWith("Why: ") ||
      !rows.slice(9).every((line) => line.startsWith("If wrong ("))
    )
      throw Error("Question fields do not match the authored format");
    return {
      id: heading[1],
      title: heading[2],
      type: heading[3]?.includes("math")
        ? "math"
        : rows[2].startsWith("Spot the flaw:")
          ? "flaw"
          : "concept",
      slide: Number(reference[1]),
      prompt: rows[2],
      ...parseCourseChoices(rows.join("\n"), { completeFeedback: true }),
    };
  });
}

export function parseVersionedTopic(
  markdown,
  { level, slideCount, questionCount, diagrams = {} },
) {
  const heading = new RegExp(`^# Topic ${level}: (.+), v[12] \\(`, "mu").exec(
    markdown,
  );
  const parts = markdown.split("## Slides\n")[1]?.split("## Questions\n");
  if (!heading || !parts || parts.length !== 2)
    throw Error("Missing topic sections");
  const slides = parseCourseSlidesMarkdown(
    parts[0].replace(/^### S/gmu, "## S"),
    diagrams,
  );
  if (slides.length !== slideCount) throw Error("Wrong slide count");
  return {
    level,
    title: heading[1],
    slides,
    questions: parseVersionedQuestions("# Topic " + level + ": \n" + parts[1], {
      level,
      slideCount,
      questionCount,
    }),
  };
}
