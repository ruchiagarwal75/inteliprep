import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import {
  getInterviewProgress,
  drawingStepInstructions,
} from "@/lib/interview-progress";
import { getProblem } from "@/lib/problems";

function problem(id = "single-server-scaling") {
  const selected = getProblem(id);
  if (!selected) throw new Error("Missing problem config");
  return selected;
}
function turns(count: number): ChatMessage[] {
  return [
    { role: "assistant", content: "Opening question" },
    ...Array.from({ length: count }, (_, index) => ({
      role: "user" as const,
      content: `Answer ${index + 1}`,
    })),
  ];
}
describe("history-based interview pacing", () => {
  it("counts candidate messages and uses each configured legacy handoff limit", () => {
    expect(getInterviewProgress(problem(), turns(1))).toEqual({
      step: "discussion",
      candidateTurns: 1,
      discussionTurnLimit: 2,
    });
    expect(getInterviewProgress(problem(), turns(2)).step).toBe(
      "invite-drawing",
    );
    expect(getInterviewProgress(problem("url-shortener"), turns(2)).step).toBe(
      "discussion",
    );
    expect(getInterviewProgress(problem("url-shortener"), turns(3)).step).toBe(
      "invite-drawing",
    );
    expect(getInterviewProgress(problem(), turns(10)).step).toBe(
      "invite-drawing",
    );
  });
  it("recognizes a delivered invitation and keeps waiting across ordinary messages", () => {
    const selected = problem();
    const history: ChatMessage[] = [
      ...turns(2),
      {
        role: "assistant",
        content: `Okay.\n\n${selected.drawingPolicy.invitation}`,
      },
      { role: "user", content: "I changed the server" },
    ];
    expect(getInterviewProgress(selected, history).step).toBe("drawing");
  });
  it("does not accept candidate text or an incomplete assistant reply as a delivered invitation", () => {
    const selected = problem();
    expect(
      getInterviewProgress(selected, [
        { role: "user", content: selected.drawingPolicy.invitation },
      ]).step,
    ).toBe("discussion");
    expect(
      getInterviewProgress(selected, [
        ...turns(2),
        { role: "assistant", content: "Partial acknowledgement" },
      ]).step,
    ).toBe("invite-drawing");
  });
  it("gives separate instructions for handoff, explanation, and permitted discussion", () => {
    const state = getInterviewProgress(problem(), turns(2));
    expect(drawingStepInstructions(state)).toContain(
      "Do not ask another question",
    );
    expect(drawingStepInstructions({ ...state, step: "drawing" })).toContain(
      "End this reply without a question",
    );
    expect(drawingStepInstructions({ ...state, step: "explaining" })).toContain(
      "Do not assume one message completes the explanation",
    );
    expect(drawingStepInstructions({ ...state, step: "review" })).toContain(
      "one focused diagram follow-up",
    );
  });
});
