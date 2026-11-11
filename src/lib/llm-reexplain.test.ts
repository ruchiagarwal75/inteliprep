import { expect, it, vi } from "vitest";
import { streamInterviewerReply } from "@/lib/llm";
import { getProblem } from "@/lib/problems";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";
const mock = vi.hoisted(() => ({ acknowledge: vi.fn() }));
vi.mock("@/lib/design-update-acknowledgement", () => ({
  acknowledgeDesignUpdate: mock.acknowledge,
}));
const history: ChatMessage[] = [
  {
    role: "user",
    source: "control",
    action: "explain",
    content: "Ready to explain",
  },
  {
    role: "user",
    content: "The API writes each request durably to the database.",
  },
  {
    role: "user",
    source: "control",
    action: "draw",
    content: "Back to drawing",
  },
  {
    role: "user",
    source: "control",
    action: "explain",
    content: "Ready to explain",
  },
];
it.each([true, false])(
  "shows only a grounded change acknowledgement: %s",
  async (change) => {
    const problem = getProblem("single-server-scaling");
    if (!problem) throw Error("Missing problem");
    const context: InterviewContext = {
      problem,
      level: "senior",
      progress: {
        step: "explaining",
        candidateTurns: 5,
        discussionTurnLimit: 2,
      },
      listening: true,
    };
    mock.acknowledge.mockResolvedValue(
      change ? "Got it, you added an evaluation gate." : undefined,
    );
    let reply = "";
    for await (const part of streamInterviewerReply(
      [
        ...history,
        {
          role: "user",
          content: "I added an evaluation gate before releases.",
        },
      ],
      "",
      "Added: evaluation gate",
      undefined,
      undefined,
      context,
    ))
      reply += part;
    expect(context.listening).toBe(!change);
    expect(reply).toBe(
      change
        ? "Got it, you added an evaluation gate."
        : "I'm reading your explanation.",
    );
    expect(reply).not.toContain("earlier explanation");
    expect(reply).not.toContain("?");
  },
);
