import { afterAll, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import examples from "../fixtures/genai-retest-2-facts.json";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
const results: unknown[] = [];
afterAll(() => {
  mkdirSync("artifacts/genai-retest-2", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest-2/fact-results.json",
    JSON.stringify({ results, calls }, null, 2),
  );
});
it.each(examples)("routes Senior $problemId: $message", async (row) => {
  const problem = getProblem(row.problemId);
  if (!problem) throw new Error("Missing problem");
  const before = calls.length;
  let reply = "";
  await metered(row.problemId + ":v2-facts", async () => {
    for await (const part of streamInterviewerReply(
      [{ role: "user", content: row.message }],
      "Empty whiteboard.",
      "No changes.",
      undefined,
      undefined,
      {
        problem,
        level: "senior",
        phase: problem.phases[0],
        mayInviteDrawing: false,
        progress: {
          step: "discussion",
          candidateTurns: 1,
          discussionTurnLimit: 99,
        },
      },
    ))
      reply += part;
  });
  const selected = calls
    .slice(before)
    .findLast((c) => c.factSelection)?.factSelection;
  results.push({ ...row, selected, reply });
  expect(selected?.intent).toBe(row.intent);
  expect(selected?.hasUnspecified).toBe(false);
  expect(selected?.factIds.slice().sort()).toEqual(row.ids.slice().sort());
  if (row.intent === "facts")
    for (const id of row.ids)
      expect(reply).toContain(
        problem.genai?.facts.find((f) => f.id === id)?.answers.senior,
      );
  else if (row.intent === "general")
    expect(reply).not.toMatch(/specified|traffic|latency|safety|permissions/iu);
  else if (row.intent === "choice") expect(reply).toMatch(/choose|choice/iu);
  else if (row.intent === "estimate") expect(reply).toMatch(/estimate/iu);
  else expect(reply).not.toMatch(/20,000|50K|40K|six model|30/iu);
});
