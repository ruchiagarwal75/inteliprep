import { describe, expect, it } from "vitest";
import {
  acquireInterviewSession,
  acquireInterviewEnd,
  createInterviewSession,
} from "@/lib/interview-sessions";
import {
  gradingSelection,
  gradingSnapshot,
  scorecardFixture,
} from "@/lib/fixtures/scorecard-test";

describe("ending temporary interviews", () => {
  it("locks out simultaneous chat and grading requests", () => {
    const id = createInterviewSession(gradingSelection);
    const chat = acquireInterviewSession(id, gradingSelection);
    expect(() =>
      acquireInterviewEnd(id, gradingSelection, gradingSnapshot),
    ).toThrow("already in progress");
    chat.release();
    const end = acquireInterviewEnd(id, gradingSelection, gradingSnapshot);
    expect(() => acquireInterviewSession(id, gradingSelection)).toThrow(
      "already in progress",
    );
    expect(() =>
      acquireInterviewEnd(id, gradingSelection, gradingSnapshot),
    ).toThrow("already in progress");
    end.release();
    expect(() => acquireInterviewSession(id, gradingSelection)).toThrow(
      "has ended",
    );
  });
  it("freezes the first end's transcript and drawing for grading retries", () => {
    const id = createInterviewSession(gradingSelection);
    const snapshot = structuredClone(gradingSnapshot);
    const first = acquireInterviewEnd(id, gradingSelection, snapshot);
    const endedAt = first.endedAt;
    snapshot.messages[1].content = "I changed my answer";
    first.snapshot?.messages.pop();
    first.release();
    const retry = acquireInterviewEnd(id, gradingSelection, {
      messages: [],
      scene: { elements: [] },
    });
    expect(retry.snapshot).toEqual(gradingSnapshot);
    expect(retry.endedAt).toBe(endedAt);
    retry.release();
  });
  it("caches a successful scorecard and drops the grading payload", () => {
    const id = createInterviewSession(gradingSelection);
    const first = acquireInterviewEnd(id, gradingSelection, gradingSnapshot);
    const card = scorecardFixture();
    first.complete(card);
    first.release();
    card.summary = "Changed outside the cache";
    const again = acquireInterviewEnd(id, gradingSelection, gradingSnapshot);
    expect(again.scorecard?.summary).not.toBe(card.summary);
    expect(again.snapshot).toBeUndefined();
    again.release();
    expect(() => first.complete(card)).toThrow("released");
  });
  it("requires the same selection and a valid started session", () => {
    const id = createInterviewSession(gradingSelection);
    expect(() =>
      acquireInterviewEnd(
        id,
        { ...gradingSelection, level: "staff" },
        gradingSnapshot,
      ),
    ).toThrow("must match");
    expect(() =>
      acquireInterviewEnd("missing", gradingSelection, gradingSnapshot),
    ).toThrow("expired");
    const stillActive = acquireInterviewSession(id, gradingSelection);
    stillActive.release();
  });
});
