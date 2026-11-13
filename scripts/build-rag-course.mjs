import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseCourseMarkdown } from "../src/lib/play/course/parse.mjs";
import { parseCourseSlidesMarkdown } from "../src/lib/play/course/parse-slides.mjs";
import { parsePrimerMarkdown } from "../src/lib/play/course/parse-primer.mjs";
import { courseContentWarnings } from "../src/lib/play/course/content-warnings.mjs";
const course = readdirSync("docs/play-content/rag-course")
  .filter((name) => /^topics-.*\.md$/u.test(name))
  .sort()
  .flatMap((name) =>
    parseCourseMarkdown(
      readFileSync(`docs/play-content/rag-course/${name}`, "utf8"),
    ),
  )
  .sort((a, b) => a.level - b.level);
course.unshift(
  parsePrimerMarkdown(
    readFileSync("docs/play-content/rag-course/topic-0-primer.md", "utf8"),
  ),
);
if (new Set(course.map((topic) => topic.level)).size !== course.length)
  throw Error("Duplicate course topic");
const first = course.find((topic) => topic.level === 1);
if (!first) throw Error("Missing first course topic");
first.slides = parseCourseSlidesMarkdown(
  readFileSync("docs/play-content/rag-course/topic-1-slides-v2.md", "utf8"),
  { 2: "pipeline", 6: "overlap", 8: "split-table", 9: "small-to-big" },
);
for (const warning of courseContentWarnings(course)) console.warn(warning);
writeFileSync(
  "src/lib/play/course/rag.json",
  JSON.stringify(course, null, 2) + "\n",
);
