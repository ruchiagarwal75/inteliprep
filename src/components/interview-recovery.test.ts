import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ChatPanel } from "@/components/chat-panel";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import type { ChatPanelProps } from "@/components/interview-chat-options";

vi.mock("@/components/candidate-account-context", () => ({
  useCandidateAccount: () => ({ request: vi.fn() }),
}));
function props(closed = false): ChatPanelProps {
  const saved = savedFixture();
  saved.messages.push({ role: "user", content: "Unanswered explanation." });
  saved.pendingReply = { messageIndex: 1, error: "Checkpoint unavailable." };
  saved.recoveryFailure = {
    code: "INTERVIEW_CHECKPOINT_INVALID",
    message: "This saved interview cannot reconnect.",
  };
  saved.closedWithoutScoring = closed;
  saved.hasEnded = closed;
  saved.draftText = "Keep my unsent draft.";
  return {
    restored: saved,
    interview: saved.interview,
    phase: saved.phase,
    hasEnded: closed,
    getScene: () => saved.whiteboard,
    getResumeToken: () => saved.interview.resumeToken,
    onBusyChange: vi.fn(),
    onPhaseChange: vi.fn(),
    onSave: async () => {},
    canSubmit: () => true,
    hasDrawing: true,
    onEndChange: vi.fn(),
    onEndConfirmed: vi.fn(),
    disabled: false,
    timeExpired: false,
    onCancelLeave: vi.fn(),
    onConfirmLeave: vi.fn(),
    onCloseWithoutScoring: async () => true,
  };
}
it("offers local close and hides impossible retries for an unreadable checkpoint", () => {
  const html = renderToStaticMarkup(createElement(ChatPanel, props()));
  expect(html).toContain("Close without scoring");
  expect(html).toContain("Retry cannot restore this checkpoint");
  expect(html).not.toContain("Retry reply");
  expect(html).not.toContain("Retry scorecard");
  expect(html).toContain("Unanswered explanation.");
});
it("reopened local closure shows the preserved draft without offering grading", () => {
  const html = renderToStaticMarkup(createElement(ChatPanel, props(true)));
  expect(html).toContain("Closed without scoring.");
  expect(html).toContain("Keep my unsent draft.");
  expect(html).not.toContain("Retry reply");
  expect(html).not.toContain("Retry scorecard");
  expect(html).not.toContain("End interview");
});
