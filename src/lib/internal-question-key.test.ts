import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { internalQuestionKey } from "./internal-question-key";
import { getProblem, listProblems } from "./problems";
import { probeTopic } from "./probe-topics";
import { stageProbes } from "./review-probes";
it("uses a stable, idempotent private namespace and opaque keys for regex topics", () => {
  expect(internalQuestionKey("cold-start")).toBe("mmq7-cold-start");
  expect(internalQuestionKey("mmq7-cold-start")).toBe("mmq7-cold-start");
  expect(internalQuestionKey("cache|caching")).toMatch(
    /^mmq7-topic-[a-f0-9]{16}$/u,
  );
  expect(internalQuestionKey(internalQuestionKey("cache|caching"))).toBe(
    internalQuestionKey("cache|caching"),
  );
  expect(internalQuestionKey("fresh:7179b8dadc8f7599")).toBe(
    "fresh:7179b8dadc8f7599",
  );
});
it("namespaces every configured fact, assumption, probe and derived topic in both tracks", () => {
  for (const row of listProblems()) {
    const problem = getProblem(row.problemId);
    if (!problem) throw Error("Missing problem");
    const raw = JSON.parse(
      readFileSync(`src/lib/problems/${problem.id}.json`, "utf8"),
    );
    for (const key of [
      ...(raw.reviewProbes ?? [])
        .map((p: { id: string; topic?: string }) =>
          [p.id, p.topic].filter(Boolean),
        )
        .flat(),
      ...(raw.genai?.facts ?? []).map((f: { id: string }) => f.id),
      ...(raw.genai?.assumptions ?? []).map((f: { id: string }) => f.id),
    ])
      expect(key).toMatch(/^mmq7-[a-z\d_-]+$/iu);
    for (const phase of problem.phases)
      for (const probe of stageProbes(
        problem,
        phase,
        "cache ranker ANN index features training replicas",
      )) {
        expect(probe.id).toMatch(/^mmq7-/u);
        expect(probeTopic(probe)).toMatch(/^mmq7-/u);
        expect(probe.question).not.toContain("mmq7-");
      }
  }
});
