import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export function privatePlayStrings() {
  const files = [
    ...readdirSync("src/lib/play/rag")
      .filter((name) => name.endsWith(".ts"))
      .map((name) => resolve("src/lib/play/rag", name)),
    resolve("src/lib/play/written-grader.ts"),
  ];
  const values = new Set([
    "private_rubric",
    "private_reference",
    "practice_drill_grade",
  ]);
  const course = JSON.parse(
    readFileSync("src/lib/play/course/rag.json", "utf8"),
  );
  for (const topic of course)
    for (const question of topic.questions)
      for (const value of [
        question.prompt,
        question.keyIdea,
        question.why,
        ...Object.values(question.ifWrong),
      ])
        values.add(value);
  for (const path of files) {
    const source = readFileSync(path, "utf8");
    if (!source.includes('import "server-only"'))
      throw Error("A Play content module lost its server boundary");
    for (const match of source.matchAll(/"(?:\\.|[^"\\])*"/gu)) {
      const text = JSON.parse(match[0]);
      if (text.length > 80) values.add(text);
    }
    for (const match of source.matchAll(
      /(?:"formula"|\bformula)\s*:\s*("(?:\\.|[^"\\])*")/gu,
    ))
      values.add(JSON.parse(match[1]));
  }
  return [...values];
}
export function assertPrivatePlayAbsent(content) {
  for (const value of privatePlayStrings())
    if (
      content.includes(value) ||
      content.includes(JSON.stringify(value).slice(1, -1))
    )
      throw Error("Private Play grading or content reached a browser chunk");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const chunks = [];
  const walk = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".js")) chunks.push(readFileSync(file, "utf8"));
    }
  };
  walk(
    resolve(
      process.env.MOCKMEAI_E2E_BUILD === "1"
        ? ".next-e2e/static"
        : ".next/static",
    ),
  );
  assertPrivatePlayAbsent(chunks.join("\n"));
  console.log(
    "Private Play answers, rubrics and math formulas are absent from browser chunks.",
  );
}
