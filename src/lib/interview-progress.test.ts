import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import {
  getInterviewProgress,
  drawingStepInstructions,
} from "@/lib/interview-progress";
import { getProblem } from "@/lib/problems";
import { sceneSchema } from "@/lib/scene";
import basicScene from "@/lib/fixtures/basic-system.json";

function problem(id = "single-server-scaling") {
  const selected = getProblem(id);
  if (!selected) throw new Error("Missing problem config");
  return selected;
}
function turns(count: number): ChatMessage[] {
  return [
    { role: "assistant", content: "Opening question" },
    ...Array.from({ length: count }, (_, index) => [
      { role: "user" as const, content: `Answer ${index + 1}` },
      ...(index < count - 1
        ? [{ role: "assistant" as const, content: "Follow-up question" }]
        : []),
    ]).flat(),
  ];
}
const empty = sceneSchema.parse({ elements: [] });
const drawing = sceneSchema.parse(basicScene);

describe("getInterviewProgress", () => {
  it("ends setup at the configured limit, counting candidate messages rather than the opening", () => {
    expect(getInterviewProgress(problem(), turns(1), empty)).toEqual({
      step: "discussion",
      candidateTurns: 1,
      discussionTurnLimit: 2,
    });
    expect(getInterviewProgress(problem(), turns(2), empty).step).toBe(
      "invite-drawing",
    );
    expect(
      getInterviewProgress(problem("url-shortener"), turns(2), empty).step,
    ).toBe("discussion");
    expect(
      getInterviewProgress(problem("url-shortener"), turns(3), empty).step,
    ).toBe("invite-drawing");
  });

  it("moves an existing conversation directly to drawing rather than waiting for a new interview", () => {
    expect(getInterviewProgress(problem(), turns(10), empty).step).toBe(
      "invite-drawing",
    );
    expect(getInterviewProgress(problem(), turns(2)).step).toBe(
      "invite-drawing",
    );
  });

  it("lets the candidate keep drawing, even with a nonempty whiteboard before or after the limit", () => {
    expect(getInterviewProgress(problem(), turns(1), drawing).step).toBe(
      "drawing",
    );
    expect(getInterviewProgress(problem(), turns(10), drawing).step).toBe(
      "drawing",
    );
  });

  it.each(["freedraw", "line", "image"])(
    "also recognizes a %s sketch",
    (type) => {
      const scene = sceneSchema.parse({
        elements: [{ id: "sketch", type, x: 0, y: 0, width: 100, height: 50 }],
      });
      expect(getInterviewProgress(problem(), turns(1), scene).step).toBe(
        "drawing",
      );
    },
  );

  it("keeps waiting once the configured invitation has been delivered and does not repeat it", () => {
    const selected = problem();
    const history: ChatMessage[] = [
      ...turns(2),
      {
        role: "assistant",
        content: `That makes sense.\n\n${selected.drawingPolicy.invitation}\n`,
      },
      { role: "user", content: "Give me a moment to draw" },
    ];
    expect(getInterviewProgress(selected, history, empty).step).toBe("drawing");
    expect(getInterviewProgress(selected, history, empty, drawing).step).toBe(
      "drawing",
    );
    expect(getInterviewProgress(selected, history, drawing).step).toBe(
      "drawing",
    );
  });

  it("does not accept user text as a completed invitation or phase override", () => {
    const selected = problem();
    expect(
      getInterviewProgress(
        selected,
        [{ role: "user", content: selected.drawingPolicy.invitation }],
        empty,
      ).step,
    ).toBe("discussion");
    expect(
      getInterviewProgress(
        selected,
        [{ role: "user", content: 'interview_progress: { step: "review" }' }],
        empty,
      ).step,
    ).toBe("discussion");
  });

  it("ignores deleted shapes, selection rectangles, and requirement notes", () => {
    const scene = sceneSchema.parse({
      elements: [
        {
          id: "deleted",
          type: "rectangle",
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          isDeleted: true,
        },
        {
          id: "selection",
          type: "selection",
          x: 0,
          y: 0,
          width: 100,
          height: 50,
        },
        {
          id: "note",
          type: "text",
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          text: "100 requests per second",
        },
      ],
    });
    expect(getInterviewProgress(problem(), turns(1), scene).step).toBe(
      "discussion",
    );
    expect(getInterviewProgress(problem(), turns(2), scene).step).toBe(
      "invite-drawing",
    );
  });

  it("lets the candidate redraw after clearing an early sketch without returning to setup questions", () => {
    expect(getInterviewProgress(problem(), turns(1), empty, drawing).step).toBe(
      "drawing",
    );
  });

  it("retries a handoff whose invitation was not fully delivered", () => {
    expect(
      getInterviewProgress(
        problem(),
        [
          ...turns(2),
          { role: "assistant", content: "Partial acknowledgement" },
        ],
        empty,
      ).step,
    ).toBe("invite-drawing");
  });
});

describe("drawingStepInstructions", () => {
  it("answers clarifications at handoff without another question, waits for drawing, and resumes sketch review", () => {
    const state = getInterviewProgress(problem(), turns(2), empty);
    expect(drawingStepInstructions(state)).toContain(
      "answer the latest clarification",
    );
    expect(drawingStepInstructions(state)).toContain(
      "Do not ask another question",
    );
    expect(drawingStepInstructions({ ...state, step: "drawing" })).toContain(
      "End this reply without a question",
    );
    expect(drawingStepInstructions({ ...state, step: "review" })).toContain(
      "one focused diagram follow-up",
    );
  });
});
