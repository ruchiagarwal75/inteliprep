import { expect, it } from "vitest";
import {
  hasAsk,
  invitesDrawing,
  repliedToOpenQuestion,
} from "@/lib/open-question";
it.each([
  "Go ahead and start designing your approach.",
  "Yes, please start drawing your design.",
  "Feel free to begin the drawing.",
  "Choose Ready to explain when you're ready.",
  "When ready, conclude the interview considering your retry budget.",
  "When ready, conclude with your tradeoff between retries and the task budget.",
  "When you're ready, end this interview.",
  "Finish the interview when you are ready.",
])("recognizes an instruction without adding a filler question: %s", (text) => {
  expect(hasAsk(text)).toBe(true);
});
it("detects a handoff even when a model also adds a question", () => {
  expect(invitesDrawing("Please start drawing. Which goal matters most?")).toBe(
    true,
  );
});
it("clears a question answered during explanation but preserves a pause alone", () => {
  const question = "How will you handle concurrent creates?";
  const messages = [
    { role: "assistant" as const, content: question },
    {
      role: "user" as const,
      content: "Pause to draw",
      source: "control" as const,
      action: "draw" as const,
    },
  ];
  expect(repliedToOpenQuestion(messages, question)).toBe(false);
  expect(
    repliedToOpenQuestion(
      [
        ...messages,
        {
          role: "user",
          content: "A single atomic operation reserves each ID range.",
        },
      ],
      question,
    ),
  ).toBe(true);
});
