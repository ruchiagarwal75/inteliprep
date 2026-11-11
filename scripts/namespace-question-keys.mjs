import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { internalQuestionKey } from "../src/lib/internal-question-key.ts";
// Idempotent, field-specific conversion. Human questions, regex patterns and facts are untouched.
for (const directory of ["src/lib/problems", "tests/fixtures/genai"]) {
  for (const name of readdirSync(directory).filter((name) =>
    name.endsWith(".json"),
  )) {
    const path = `${directory}/${name}`;
    const data = JSON.parse(readFileSync(path, "utf8"));
    for (const probe of data.reviewProbes ?? []) {
      probe.id = internalQuestionKey(probe.id);
      if (probe.topic) probe.topic = internalQuestionKey(probe.topic);
    }
    for (const fact of data.genai?.facts ?? data.facts ?? [])
      fact.id = internalQuestionKey(fact.id);
    for (const assumption of data.genai?.assumptions ?? [])
      assumption.id = internalQuestionKey(assumption.id);
    writeFileSync(
      path,
      await format(JSON.stringify(data), {
        parser: "json",
        trailingComma: "all",
      }),
    );
  }
}
for (const path of [
  "tests/fixtures/genai-fact-paraphrases.json",
  "tests/fixtures/genai-retest-2-facts.json",
]) {
  const rows = JSON.parse(readFileSync(path, "utf8"));
  for (const row of rows) row.ids = row.ids.map(internalQuestionKey);
  writeFileSync(
    path,
    await format(JSON.stringify(rows), {
      parser: "json",
      trailingComma: "all",
    }),
  );
}
