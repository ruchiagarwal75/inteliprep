import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import { getInterviewProgress } from "@/lib/interview-progress";
import {
  actionForTurn,
  designDiscussionControl,
} from "@/lib/candidate-actions";
import { getProblem } from "@/lib/problems";
import { sceneSchema } from "@/lib/scene";
import basicScene from "@/lib/fixtures/basic-system.json";

function problem() {
  const selected = getProblem("single-server-scaling");
  if (!selected) throw new Error("Missing problem config");
  return selected;
}
function turns(count: number): ChatMessage[] {
  return Array.from({ length: count }, () => ({
    role: "user",
    content: "Initial answer",
  }));
}
const empty = sceneSchema.parse({ elements: [] });
const drawing = sceneSchema.parse(basicScene);

describe("candidate-paced drawing and explanation", () => {
  it("holds questions through the combined control's explanation step and opens review only on completion", () => {
    const start = designDiscussionControl("draw");
    const history: ChatMessage[] = [
      { role: "user", content: start.message, action: start.action },
      { role: "assistant", content: "Go ahead with your explanation." },
      { role: "user", content: "The server handles requests and stores data." },
      { role: "assistant", content: "I'm listening." },
      {
        role: "user",
        content: "More CPU capacity helps at the cost of a larger machine.",
      },
    ];
    expect(getInterviewProgress(problem(), history, drawing).step).toBe(
      "explaining",
    );
    const finish = designDiscussionControl("explain");
    history.push({
      role: "user",
      content: finish.message,
      action: finish.action,
    });
    expect(getInterviewProgress(problem(), history, drawing).step).toBe(
      "review",
    );
    const update = designDiscussionControl("review");
    history.push({
      role: "user",
      content: update.message,
      action: update.action,
    });
    expect(getInterviewProgress(problem(), history, drawing).step).toBe(
      "explaining",
    );
  });
  it("holds questions through a multi-message explanation until discussion is explicitly requested", () => {
    const history: ChatMessage[] = [
      ...turns(2),
      { role: "user", content: "Done" },
      { role: "assistant", content: "Go ahead with your explanation." },
      { role: "user", content: "The client sends requests to this server." },
      { role: "assistant", content: "I'm listening." },
      { role: "user", content: "Then the server reads from the database." },
    ];
    expect(getInterviewProgress(problem(), history, drawing).step).toBe(
      "explaining",
    );
    expect(
      getInterviewProgress(
        problem(),
        [...history, { role: "user", content: "I'm ready for questions" }],
        drawing,
      ).step,
    ).toBe("review");
  });

  it("respects controls and keeps a pause after review through ordinary chat", () => {
    const history: ChatMessage[] = [
      ...turns(1),
      { role: "user", content: "Review this", action: "review" },
    ];
    expect(getInterviewProgress(problem(), history, drawing).step).toBe(
      "review",
    );
    const paused: ChatMessage[] = [
      ...history,
      { role: "user", content: "I'm still drawing" },
    ];
    expect(getInterviewProgress(problem(), paused, drawing).step).toBe(
      "drawing",
    );
    expect(
      getInterviewProgress(
        problem(),
        [...paused, { role: "user", content: "What is the traffic target?" }],
        drawing,
        drawing,
      ).step,
    ).toBe("drawing");
    expect(
      getInterviewProgress(
        problem(),
        [
          ...paused,
          { role: "user", content: "I'll explain now", action: "explain" },
        ],
        drawing,
      ).step,
    ).toBe("explaining");
  });

  it("pauses on edits during review but honors an explicit request to discuss the updated drawing", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "Let's discuss", action: "review" },
      { role: "assistant", content: "How does it handle traffic?" },
      { role: "user", content: "I changed the server" },
    ];
    expect(
      getInterviewProgress(problem(), history, drawing, drawing).step,
    ).toBe("review");
    expect(getInterviewProgress(problem(), history, drawing, empty).step).toBe(
      "drawing",
    );
    expect(getInterviewProgress(problem(), history, empty, drawing).step).toBe(
      "drawing",
    );
    expect(
      getInterviewProgress(
        problem(),
        [...history, { role: "user", content: "Let's discuss" }],
        drawing,
        empty,
      ).step,
    ).toBe("review");
  });

  it("persists the automatic pause after the edited capture becomes the new baseline", () => {
    const action = actionForTurn(
      "I changed the server",
      undefined,
      "review",
      true,
    );
    const history: ChatMessage[] = [
      { role: "user", content: "Let's discuss", action: "review" },
      { role: "user", content: "I changed the server", action },
      { role: "assistant", content: "Take your time drawing." },
      { role: "user", content: "What is the target traffic?" },
    ];
    expect(
      getInterviewProgress(problem(), history, drawing, drawing).step,
    ).toBe("drawing");
  });
});
