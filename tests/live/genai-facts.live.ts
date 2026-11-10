import { afterAll, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import examples from "../fixtures/genai-fact-paraphrases.json";
import { getProblem } from "@/lib/problems";
import { classifyGenaiFacts } from "@/lib/genai-fact-router";
import { genaiFact } from "@/lib/genai-facts";
import { interviewLevelSchema } from "@/lib/interview-selection";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
const results: unknown[] = [];
mkdirSync("artifacts/genai-retest", { recursive: true });
afterAll(() =>
  writeFileSync(
    "artifacts/genai-retest/fact-paraphrases.json",
    JSON.stringify({ results, calls }, null, 2),
  ),
);
it.each(examples)(
  "selects $level $problemId: $message",
  async ({ problemId, message, ids, level }) => {
    const problem = getProblem(problemId);
    if (!problem) throw new Error("Missing GenAI problem");
    const selected = await metered(problemId + ":facts", () =>
      classifyGenaiFacts(problem, message),
    );
    const answer = genaiFact(
      problem,
      interviewLevelSchema.parse(level),
      selected.factIds,
    );
    results.push({ problemId, level, message, selected, answer });
    expect(selected.intent).toBe("facts");
    expect([...selected.factIds].sort()).toEqual([...ids].sort());
  },
);
