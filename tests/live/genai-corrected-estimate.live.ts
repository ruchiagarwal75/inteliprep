import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("asks for a redo once and accepts the corrected GPU estimate", async () => {
  const problem = getProblem("ai-chat-assistant");
  if (!problem?.genai) throw new Error("Missing chat configuration");
  const ids = ["dau", "messages-per-user", "peak", "tokens", "gpu-throughput"];
  const facts = problem.genai.facts
    .filter((f) => ids.includes(f.id))
    .map((f) => f.answers.senior)
    .join("\n\n");
  const messages: ChatMessage[] = [{ role: "assistant", content: facts }];
  const outputs: { message: string; reply: string; accepted: boolean }[] = [];
  for (const message of [
    "I estimate about 17 GPUs for all large-model peak traffic: 20M users times 15 messages, three times peak, 400 output tokens each, and 2,500 output tokens per second per GPU.",
    "I estimate 300M messages/day divided by 86,400 gives about 3,472 messages/s; three-times peak is 10,417/s. At 400 output tokens each that is 4.17M output tokens/s. Dividing by 2,500 per GPU gives about 1,667 GPUs, before spare capacity. Does that sound right?",
  ]) {
    messages.push({ role: "user", content: message });
    const context: InterviewContext = {
      problem,
      level: "senior",
      phase: problem.phases[0],
      coveredCriteria: [0, 1, 2],
      mayInviteDrawing: false,
      progress: {
        step: "discussion",
        candidateTurns: 1,
        discussionTurnLimit: 99,
      },
    };
    let reply = "";
    await metered("corrected-gpu-estimate", async () => {
      for await (const part of streamInterviewerReply(
        messages,
        "Empty whiteboard.",
        "No changes.",
        undefined,
        undefined,
        context,
      ))
        reply += part;
    });
    outputs.push({ message, reply, accepted: !!context.estimateAccepted });
    messages.push({ role: "assistant", content: reply });
  }
  mkdirSync("artifacts/genai-retest", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest/corrected-estimate.json",
    JSON.stringify({ outputs, calls }, null, 2),
  );
  expect(outputs[0].reply).toMatch(/redo/iu);
  expect(outputs[0].reply).not.toMatch(/1,?667|conversion|86,?400/iu);
  expect(outputs[1].accepted).toBe(true);
  expect(outputs[1].reply).not.toMatch(
    /isn't specified|What would you assume/iu,
  );
  expect(outputs[1].reply).not.toMatch(
    /What inputs|redo|work through.*estimate|walk through.*estimate/iu,
  );
});
