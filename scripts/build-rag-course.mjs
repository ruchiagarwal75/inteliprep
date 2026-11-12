import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseCourseMarkdown } from "../src/lib/play/course/parse.mjs";
const course = readdirSync("docs/play-content/rag-course")
  .filter((name) => /^topics-.*\.md$/u.test(name))
  .sort()
  .flatMap((name) =>
    parseCourseMarkdown(
      readFileSync(`docs/play-content/rag-course/${name}`, "utf8"),
    ),
  )
  .sort((a, b) => a.level - b.level);
if (new Set(course.map((topic) => topic.level)).size !== course.length)
  throw Error("Duplicate course topic");
writeFileSync(
  "src/lib/play/course/rag.json",
  JSON.stringify(course, null, 2) + "\n",
);
