import { readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { parseCourseSlidesMarkdown } from "../src/lib/play/course/parse-slides.mjs";
import { parsePrimerMarkdown } from "../src/lib/play/course/parse-primer.mjs";
import {
  parseVersionedQuestions,
  parseVersionedTopic,
} from "../src/lib/play/course/parse-v2.mjs";
import { courseContentWarnings } from "../src/lib/play/course/content-warnings.mjs";
const read = (name) =>
  readFileSync(`docs/play-content/rag-course/${name}`, "utf8");
const slides = parseCourseSlidesMarkdown(read("topic-1-slides-v2.md"), {
  2: "pipeline",
  6: "overlap",
  8: "split-table",
  9: "small-to-big",
});
const course = [
  parsePrimerMarkdown(read("topic-0-primer.md")),
  {
    level: 1,
    title: "Ingestion and chunking",
    slides,
    questions: parseVersionedQuestions(read("topic-1-questions-v2.md"), {
      level: 1,
      slideCount: slides.length,
      questionCount: 7,
    }),
  },
  parseVersionedTopic(read("topic-2-v2.md"), {
    level: 2,
    slideCount: 13,
    questionCount: 10,
  }),
  parseVersionedTopic(read("topic-3-v2.md"), {
    level: 3,
    slideCount: 12,
    questionCount: 10,
  }),
];
for (const warning of courseContentWarnings(course)) console.warn(warning);
const output = "src/lib/play/course/rag.json";
if (process.argv.includes("--check")) {
  if (!isDeepStrictEqual(course, JSON.parse(readFileSync(output, "utf8"))))
    throw Error(
      "Course content changed. Run node scripts/build-rag-course.mjs and format its JSON output.",
    );
  console.log("Compiled course matches the authored sources.");
} else writeFileSync(output, JSON.stringify(course, null, 2) + "\n");
