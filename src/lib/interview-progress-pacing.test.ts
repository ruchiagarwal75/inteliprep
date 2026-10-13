import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import { getInterviewProgress } from "@/lib/interview-progress";
import {
  actionForTurn,
  designDiscussionControl,
} from "@/lib/candidate-actions";
import { getProblem } from "@/lib/problems";

function progress(history: ChatMessage[]) {
  const problem = getProblem("single-server-scaling");
  if (!problem) throw new Error("Missing problem config");
  return getInterviewProgress(problem, history).step;
}
describe("candidate-paced drawing and explanation", () => {
  it("keeps a multi-message explanation open until Done explaining, then allows another explanation", () => {
    const start = designDiscussionControl("draw");
    const history: ChatMessage[] = [
      { role: "user", content: start.message, action: start.action },
      { role: "user", content: "Requests go to the app." },
      { role: "user", content: "Then the app reads from the database." },
    ];
    expect(progress(history)).toBe("explaining");
    const finish = designDiscussionControl("explain");
    history.push({
      role: "user",
      content: finish.message,
      action: finish.action,
    });
    expect(progress(history)).toBe("review");
    const update = designDiscussionControl("review");
    history.push({
      role: "user",
      content: update.message,
      action: update.action,
    });
    expect(progress(history)).toBe("explaining");
  });
  it("interprets Please let me finish as keeping the explanation floor", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "Please let me finish" },
      { role: "user", content: "The client sends requests here." },
      { role: "user", content: "I also use a cache." },
    ];
    expect(progress(history)).toBe("explaining");
  });
  it("honors an explicit pause and holds it through subsequent chat", () => {
    expect(
      progress([
        { role: "user", content: "Let's discuss" },
        { role: "user", content: "I'm still drawing" },
        { role: "user", content: "What is the target traffic?" },
      ]),
    ).toBe("drawing");
  });
  it("preserves discussion when the candidate describes an edit without asking to pause", () => {
    const content = "I changed the server";
    expect(
      progress([
        { role: "user", content: "Let's discuss", action: "review" },
        { role: "user", content, action: actionForTurn(content, undefined) },
      ]),
    ).toBe("review");
  });
});
