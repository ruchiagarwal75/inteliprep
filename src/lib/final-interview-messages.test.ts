import { describe, expect, it } from "vitest";
import { finalInterviewMessages } from "@/lib/final-interview-messages";
import type { ChatMessage } from "@/lib/chat";

describe("confirmed final drafts", () => {
  const messages: ChatMessage[] = [
    { role: "assistant", content: "Opening" },
    { role: "user", content: "Initial answer" },
    { role: "assistant", content: "" },
  ];
  it("includes the frozen draft as a final candidate answer and isolates the transcript", () => {
    const final = finalInterviewMessages(
      messages,
      " I generate unique IDs and retry collisions. ",
    );
    expect(final).toHaveLength(3);
    expect(final.at(-1)).toEqual({
      role: "user",
      content: "I generate unique IDs and retry collisions.",
    });
    final[0].content = "Changed";
    expect(messages[0].content).toBe("Opening");
  });
  it("leaves an excluded or blank draft out of scoring", () => {
    expect(finalInterviewMessages(messages)).toEqual(messages.slice(0, 2));
    expect(finalInterviewMessages(messages, "  ")).toEqual(
      messages.slice(0, 2),
    );
  });
});
