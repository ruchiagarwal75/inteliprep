import { expect, it } from "vitest";
import { interviewerChatText } from "@/lib/chat-display";
it("shows a saved legacy opening's own closing question without replacing it", () => {
  const opening =
    "Design a chat service.\n\nWhich message guarantees would you establish first?";
  expect(interviewerChatText(opening, opening)).toBe(
    "Which message guarantees would you establish first?",
  );
});
it("leaves a short opening intact and keeps drawing status out of message bubbles", () => {
  expect(
    interviewerChatText("What would you clarify?", "What would you clarify?"),
  ).toBe("What would you clarify?");
  expect(interviewerChatText("Please start drawing your design.")).toBe("");
});
