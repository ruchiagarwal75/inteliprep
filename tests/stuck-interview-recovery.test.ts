import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as resume } from "@/app/api/interview/resume/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as end } from "@/app/api/interview/end/route";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { createCandidateBrowserScope } from "@/lib/candidate-browser-scope";
import { reconnectInterview } from "@/lib/reconnect-interview";
import { postChatTurn } from "@/lib/post-chat-turn";
import {
  InterviewRecoveryError,
  interviewRecoveryFailure,
} from "@/lib/interview-recovery";
import { closedInterviewUpdate } from "@/lib/close-interview";
import { interviewSessionState } from "@/lib/interview-session-context";
import {
  savedInterviewSchema,
  savedInterviewSummary,
  updateSavedInterview,
} from "@/lib/saved-interview";

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubEnv("OPENAI_KEY", "test-model-key");
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "original-test-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
const request = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("unreadable saved checkpoint recovery", () => {
  it("returns permanent failure codes through resume, chat, and end without grading or sign-out", async () => {
    const saved = savedFixture();
    // A redeploy/cold server has no cached copy and must validate the old checkpoint.
    interviewSessionState().delete(saved.id);
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "rotated-test-secret");
    const payload = {
      ...saved.interview,
      messages: [
        ...saved.messages,
        { role: "user" as const, content: "Let's discuss my design." },
      ],
    };
    for (const [url, handler] of [
      ["/api/interview/resume", resume],
      ["/api/chat", chat],
      ["/api/interview/end", end],
    ] as const) {
      const response = await handler(request(url, payload));
      expect(response.status).toBe(409);
      expect(response.headers.has("X-Interview-Auth-Error")).toBe(false);
      expect(
        interviewRecoveryFailure(response.status, await response.json())?.code,
      ).toBe("INTERVIEW_CHECKPOINT_INVALID");
    }
    await expect(
      postChatTurn(
        async () => chat(request("/api/chat", payload)),
        payload,
        vi.fn(),
        vi.fn(),
      ),
    ).rejects.toBeInstanceOf(InterviewRecoveryError);
  });
  it("closes in browser storage, keeps original chat/drawing/draft, and reopens offline", async () => {
    const saved = savedFixture();
    saved.messages.push({
      role: "user",
      content: "My message awaiting a reply.",
    });
    saved.pendingReply = { messageIndex: 1, error: "Checkpoint unavailable." };
    saved.draftText = "An unsent explanation I want to keep.";
    interviewSessionState().delete(saved.id);
    vi.stubEnv("INTERVIEW_RESUME_SECRET", "rotated-test-secret");
    const restored = await reconnectInterview(saved, async () =>
      resume(request("/api/interview/resume", saved.interview)),
    );
    expect(restored.recoveryFailure?.code).toBe("INTERVIEW_CHECKPOINT_INVALID");
    expect(restored.messages).toBe(saved.messages);
    const changedAccount = vi.fn();
    const scope = createCandidateBrowserScope(
      "11111111-1111-4111-8111-111111111111",
      changedAccount,
    );
    await scope.storage.saveInterview(restored);
    const closed = updateSavedInterview(
      restored,
      closedInterviewUpdate(restored.messages, restored.draftText),
      restored.whiteboard,
    );
    expect(savedInterviewSchema.safeParse(closed).success).toBe(true);
    await scope.storage.saveInterview(closed);
    const reopened = await scope.storage.readInterview(saved.id);
    if (!reopened) throw new Error("Closed interview was lost");
    expect(reopened).toMatchObject({
      hasEnded: true,
      closedWithoutScoring: true,
      draftText: saved.draftText,
      messages: saved.messages,
      whiteboard: saved.whiteboard,
    });
    expect(reopened.pendingReply).toBeUndefined();
    expect(reopened.endRequest).toBeUndefined();
    expect(reopened.scorecard).toBeUndefined();
    expect(savedInterviewSummary(reopened)).toMatchObject({
      closedWithoutScoring: true,
      hasScorecard: false,
    });
    const offline = vi.fn().mockRejectedValue(new Error("Offline"));
    expect(await reconnectInterview(reopened, offline)).toBe(reopened);
    expect(offline).not.toHaveBeenCalled();
    expect(changedAccount).not.toHaveBeenCalled();
  });
  it.each([409, 429, 502, 503])(
    "leaves temporary %s failures retryable",
    (status) => {
      expect(
        interviewRecoveryFailure(status, { error: "Please wait and retry." }),
      ).toBeUndefined();
    },
  );
});
