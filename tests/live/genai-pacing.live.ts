import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
import type { ChatMessage } from "@/lib/chat";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("answers facts quietly with occasional varied prompts and a topic-free general continuation", async () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw new Error("Missing RAG");
  const messages: ChatMessage[] = [];
  const results: { question: string; answer: string }[] = [];
  const questions = [
    "How big is the company?",
    "What's the size of the corpus?",
    "How much load should I expect?",
    "How quickly do edits need to show up in answers?",
    "What fraction of documents are private?",
    "What is the answer latency target?",
    "What else should I know?",
  ];
  for (const question of questions) {
    messages.push({ role: "user", content: question });
    const answer = await metered("pacing", async () => {
      let text = "";
      for await (const part of streamInterviewerReply(
        messages,
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
            candidateTurns: results.length + 1,
            discussionTurnLimit: 99,
          },
        },
      ))
        text += part;
      return text;
    });
    results.push({ question, answer });
    messages.push({ role: "assistant", content: answer });
  }
  mkdirSync("artifacts/genai-retest", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest/clarification-pacing.json",
    JSON.stringify({ results, calls }, null, 2),
  );
  for (const i of [0, 1, 3, 4]) expect(results[i].answer).not.toMatch(/[?？]/u);
  expect(results[2].answer).toContain("Is there another requirement");
  expect(results[5].answer).toContain("What else would you like to clarify?");
  expect(results[6].answer).toContain("What would you like to know?");
  expect(results[6].answer).not.toMatch(/specified|assum/iu);
  expect(results[6].answer).not.toMatch(
    /traffic|latency|safety|permission|source|documents/iu,
  );
});
