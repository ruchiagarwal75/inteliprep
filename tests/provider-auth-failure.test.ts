import { APIError } from "openai";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { createCandidateBrowserScope } from "@/lib/candidate-browser-scope";
import { CANDIDATE_AUTH_ERROR_HEADER } from "@/lib/candidate-api-error";
import { postChatTurn, INTERVIEWER_UNAVAILABLE } from "@/lib/post-chat-turn";
import {
  restoredPendingReply,
  retryChatMessages,
} from "@/lib/pending-chat-reply";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { updateSavedInterview } from "@/lib/saved-interview";
import { captureScene } from "@/lib/scene-snapshot";
import { acquireInterviewSession } from "@/lib/interview-sessions";

const mocks = vi.hoisted(() => ({ stream: vi.fn(), hasApiKey: vi.fn() }));
vi.mock("@/lib/llm", () => ({
  streamInterviewerReply: mocks.stream,
  hasApiKey: mocks.hasApiKey,
}));
const userId = "11111111-1111-4111-8111-111111111111";
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: async () => [],
}));
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubEnv("OPENAI_KEY", "test-key");
  mocks.stream.mockReset();
  mocks.hasApiKey.mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("provider failures across API, browser account scope, and saved interviews", () => {
  it.each([
    [401, "expired_secret_key", 503],
    [403, "permission_denied", 503],
    [503, "service_unavailable", 502],
  ] as const)(
    "keeps the session and retries one original turn after provider %s",
    async (status, code, expectedStatus) => {
      mocks.stream.mockImplementation(async function* () {
        throw new APIError(
          status,
          { code },
          "Private provider detail",
          undefined,
        );
        yield "";
      });
      const responses: Response[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
          const response = await POST(
            new Request(new URL(String(input), "http://localhost"), init),
          );
          responses.push(response.clone());
          return response;
        }),
      );
      const changed = vi.fn();
      const scope = createCandidateBrowserScope(userId, changed);
      const saved = savedFixture();
      const lease = acquireInterviewSession(saved.id, saved.interview);
      lease.commit({ phaseIndex: 1, coveredCriteria: [] });
      lease.release();
      saved.messages.push({
        role: "user",
        content: "Let's discuss my design. Requests use shared storage.",
        action: "review",
      });
      saved.pendingReply = { messageIndex: 1 };
      saved.draftText = "My next thought, which must not be cleared by retry.";
      await scope.storage.saveInterview(saved);
      const payload = {
        problemId: saved.interview.problemId,
        level: saved.interview.level,
        sessionId: saved.id,
        resumeToken: saved.interview.resumeToken,
        messages: saved.messages,
        scene: captureScene(saved.whiteboard.elements),
      };
      await expect(
        postChatTurn(scope.request, payload, vi.fn(), vi.fn()),
      ).rejects.toThrow(INTERVIEWER_UNAVAILABLE);
      expect(responses[0].status).toBe(expectedStatus);
      expect(responses[0].headers.get(CANDIDATE_AUTH_ERROR_HEADER)).toBeNull();
      expect(await responses[0].json()).toEqual({
        error: INTERVIEWER_UNAVAILABLE,
        code,
      });
      expect(changed).not.toHaveBeenCalled();
      const state = acquireInterviewSession(saved.id, saved.interview);
      expect(state.state.phaseIndex).toBe(1);
      state.release();
      const failed = updateSavedInterview(
        saved,
        {
          pendingReply: { messageIndex: 1, error: INTERVIEWER_UNAVAILABLE },
        },
        saved.whiteboard,
      );
      await scope.storage.saveInterview(failed);
      const reopenedScope = createCandidateBrowserScope(userId, changed);
      const reopened = await reopenedScope.storage.readInterview(saved.id);
      if (!reopened) throw new Error("Saved message was lost");
      const pending = restoredPendingReply(reopened);
      if (!pending) throw new Error("Pending reply was lost");
      expect(reopened.draftText).toBe(saved.draftText);
      expect(reopened.whiteboard).toEqual(saved.whiteboard);
      mocks.stream.mockImplementationOnce(async function* () {
        yield "Let's discuss the storage path.";
      });
      const messages = retryChatMessages(reopened.messages, pending);
      const reply = await postChatTurn(
        reopenedScope.request,
        { ...payload, messages },
        vi.fn(),
        vi.fn(),
      );
      expect(reply.phase.position).toBe(3);
      const completed = updateSavedInterview(
        reopened,
        {
          messages: [...messages, { role: "assistant", content: reply.reply }],
          pendingReply: undefined,
          phase: reply.phase,
          resumeToken: reply.resumeToken,
        },
        reopened.whiteboard,
      );
      await reopenedScope.storage.saveInterview(completed);
      const final = await reopenedScope.storage.readInterview(saved.id);
      expect(final?.pendingReply).toBeUndefined();
      expect(
        final?.messages.filter((message) => message.role === "user"),
      ).toHaveLength(1);
      expect(final?.draftText).toBe(saved.draftText);
      expect(changed).not.toHaveBeenCalled();
    },
  );
});
