import { expect, it, vi } from "vitest";
import { uniqueInterviewerReply } from "@/lib/unique-interviewer-reply";
import { repeatedInterviewerSentences } from "@/lib/reply-novelty";
import { getProblem } from "@/lib/problems";
import type { ChatMessage } from "@/lib/chat";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
it("rewrites a reused unspecified-fact answer without repeating a sentence", async () => {
  const problem = getProblem("ai-chat-assistant");
  if (!problem) throw Error("Missing problem");
  const messages: ChatMessage[] = [
    {
      role: "assistant",
      content: "That detail is unspecified. What assumption would you make?",
    },
    { role: "assistant", content: problem.drawingPolicy.invitation },
  ];
  const reply = await uniqueInterviewerReply(
    "That detail is unspecified. What assumption would you make?",
    messages,
  );
  expect(repeatedInterviewerSentences(reply, messages)).toEqual([]);
  const drawing = await uniqueInterviewerReply(
    problem.drawingPolicy.invitation,
    messages,
  );
  expect(repeatedInterviewerSentences(drawing, messages)).toEqual([]);
});
