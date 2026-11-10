import { expect, it } from "vitest";
import { hasExplanation, hasPriorExplanation } from "@/lib/open-question";
import type { ChatMessage } from "@/lib/chat";
const explain: ChatMessage = {
  role: "user",
  source: "control",
  action: "explain",
  content: "Ready to explain",
};
const draw: ChatMessage = {
  role: "user",
  source: "control",
  action: "draw",
  content: "Back to drawing",
};
const answer: ChatMessage = {
  role: "user",
  content:
    "The API validates requests, writes durably, and returns a stable identifier.",
};
it("retains the walkthrough through a draw/explain cycle without a new message", () => {
  const history = [explain, answer, draw, explain];
  expect(hasExplanation(history)).toBe(true);
  expect(hasPriorExplanation(history)).toBe(true);
});
it("still requires an initial walkthrough and does not count controls or clarification", () => {
  expect(hasExplanation([explain])).toBe(false);
  expect(hasExplanation([answer, draw, explain])).toBe(false);
  expect(hasPriorExplanation([answer, draw, explain])).toBe(false);
});
