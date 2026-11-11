import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve(
  process.env.MOCKMEAI_E2E_BUILD === "1" ? ".next-e2e/static" : ".next/static",
);
const chunks = [];
function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = resolve(path, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith(".js"))
      chunks.push(readFileSync(file, "utf8"));
  }
}
walk(directory);
const content = chunks.join("\n");
for (const file of readdirSync("src/lib/problems").filter((name) =>
  name.endsWith(".json"),
)) {
  const problem = JSON.parse(
    readFileSync(resolve("src/lib/problems", file), "utf8"),
  );
  const privateText = [
    ...problem.rubric.map((area) => area.strong),
    ...Object.values(problem.levels).flatMap((level) => [
      level.expectations,
      ...level.scaleHints,
    ]),
    ...(problem.genai
      ? [
          ...problem.genai.facts.flatMap((fact) => Object.values(fact.answers)),
          ...Object.values(problem.genai.estimateAnchors).flat(),
          ...problem.genai.expectedDesign,
          ...problem.genai.redFlags,
        ]
      : []),
  ];
  for (const value of privateText.filter((value) => value.length >= 30))
    if (
      content.includes(JSON.stringify(value).slice(1, -1)) ||
      content.includes(value)
    )
      throw Error(
        `Private problem content reached a browser chunk: ${problem.id}`,
      );
}
for (const key of [
  "estimateAnchors",
  "expectedDesign",
  "redFlags",
  "interviewerRules",
  "evaluationArea",
  "safetyArea",
  "PRIVATE_ANCHOR_CANARY",
])
  if (content.includes(key))
    throw Error("Private problem configuration reached browser JavaScript");
console.log(
  "Private problem facts and rubrics are absent from browser chunks.",
);
