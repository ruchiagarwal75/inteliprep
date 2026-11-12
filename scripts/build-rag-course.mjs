import { readFileSync, writeFileSync } from "node:fs";
import { parseCourseMarkdown } from "../src/lib/play/course/parse.mjs";
const course = parseCourseMarkdown(
  readFileSync("docs/play-content/rag-course/topics-1-3.md", "utf8"),
);
writeFileSync(
  "src/lib/play/course/rag.json",
  JSON.stringify(course, null, 2) + "\n",
);
