import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("answers imperative and informal clarification requests through the real classifier", async () => {
  const rows = [
    {
      problemId: "enterprise-rag-assistant",
      message: "Tell me the expected traffic.",
      expected: "100K questions",
    },
    {
      problemId: "enterprise-rag-assistant",
      message: "I'd like to know how many users there are.",
      expected: "20,000 employees",
    },
    {
      problemId: "ai-chat-assistant",
      message: "Whats the dau",
      expected: "20M",
    },
  ];
  const results = [];
  for (const row of rows) {
    const problem = getProblem(row.problemId);
    if (!problem) throw new Error("Missing problem");
    let reply = "";
    await metered(row.problemId + ":request", async () => {
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
    results.push({ ...row, reply });
    expect(reply).toContain(row.expected);
  }
  mkdirSync("artifacts/genai-retest-2", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest-2/imperative-requests.json",
    JSON.stringify({ results, calls }, null, 2),
  );
});
