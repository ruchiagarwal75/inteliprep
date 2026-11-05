import { describe, expect, it } from "vitest";
import {
  restoredPendingReply,
  retryChatMessages,
} from "@/lib/pending-chat-reply";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import {
  savedInterviewSchema,
  updateSavedInterview,
} from "@/lib/saved-interview";

describe("unanswered chat recovery", () => {
  it("keeps the original turn, drawing, baselines and new draft through saving and retry", () => {
    const saved = savedFixture();
    const messages = [
      ...saved.messages,
      { role: "user" as const, content: "I would measure CPU first." },
    ];
    const waiting = updateSavedInterview(
      saved,
      {
        messages,
        pendingReply: { messageIndex: 1, error: "Interviewer unavailable." },
        draftText: "A separate thought for my next message.",
      },
      saved.whiteboard,
    );
    const reopened = savedInterviewSchema.parse(
      JSON.parse(JSON.stringify(waiting)),
    );
    const pending = restoredPendingReply(reopened);
    if (!pending) throw new Error("Missing pending reply");
    expect(
      retryChatMessages(
        [
          ...reopened.messages,
          { role: "assistant", content: "Incomplete text" },
        ],
        pending,
      ),
    ).toEqual(messages);
    expect(reopened.draftText).toBe("A separate thought for my next message.");
    expect(reopened.whiteboard).toEqual(saved.whiteboard);
    expect(reopened.phase).toEqual(saved.phase);
    expect(reopened.previousScene).toEqual(saved.previousScene);
    const finished = updateSavedInterview(
      reopened,
      {
        pendingReply: undefined,
        messages: [
          ...messages,
          { role: "assistant", content: "Which measurement would help?" },
        ],
      },
      saved.whiteboard,
    );
    expect(
      restoredPendingReply(savedInterviewSchema.parse(finished)),
    ).toBeUndefined();
    expect(finished.draftText).toBe(reopened.draftText);
  });
  it("recovers legacy unanswered discussion controls without treating quiet listening as a failure", () => {
    const saved = savedFixture();
    saved.messages.push({
      role: "user",
      content: "Let's discuss my design.",
      action: "review",
      source: "control",
    });
    expect(restoredPendingReply(saved)).toMatchObject({ messageIndex: 1 });
    for (const action of ["draw", "explain"] as const) {
      saved.messages[1] = {
        role: "user",
        content: "Give me the floor.",
        action,
      };
      saved.messages.push({
        role: "user",
        content: "The app writes to shared storage.",
      });
      expect(restoredPendingReply(saved)).toBeUndefined();
      saved.messages.pop();
    }
    saved.pendingReply = { messageIndex: 1 };
    expect(restoredPendingReply(saved)?.error).toContain("no completed reply");
    saved.hasEnded = true;
    expect(restoredPendingReply(saved)).toBeUndefined();
  });
  it("rejects references that do not identify a candidate message", () => {
    const saved = savedFixture();
    for (const messageIndex of [-1, 0, 101, 102]) {
      expect(
        savedInterviewSchema.safeParse({
          ...saved,
          pendingReply: { messageIndex },
        }).success,
      ).toBe(false);
    }
    expect(() =>
      retryChatMessages(saved.messages, { messageIndex: 0 }),
    ).toThrow("could not be found");
  });
});
