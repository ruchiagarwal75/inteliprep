import { parseCourseChoices } from "./parse.mjs";
import { parseCourseSlidesMarkdown } from "./parse-slides.mjs";

/** Compile the supplied primer verbatim, apart from authoring markers. */
export function parsePrimerMarkdown(
  markdown,
  diagrams = { 2: "rag-answer", 7: "rag-models", 8: "rag-two-paths" },
) {
  const slides = markdown.split("## Slides\n")[1]?.split("## Questions\n")[0];
  const questions = markdown.split("## Questions\n")[1];
  if (!slides || !questions) throw Error("Missing primer sections");
  const parsed = questions
    .split(/^(?=P-Q\d+ · )/mu)
    .filter((source) => source.startsWith("P-Q"))
    .map((source, index) => {
      const heading = /^(P-Q\d+) · (.+)\n(.+)$/mu.exec(source);
      if (!heading || heading[1] !== `P-Q${index + 1}`)
        throw Error("Invalid primer question order");
      return {
        id: heading[1],
        title: heading[2].replace(/ \(math\)$/u, ""),
        type: heading[2].endsWith("(math)") ? "math" : "concept",
        prompt: heading[3],
        ...parseCourseChoices(source),
      };
    });
  if (parsed.length !== 8) throw Error("The primer needs eight questions");
  return {
    level: 0,
    title: "RAG basics",
    slides: parseCourseSlidesMarkdown(
      slides.replace(/^### S/gmu, "## S"),
      diagrams,
    ),
    questions: parsed,
  };
}
