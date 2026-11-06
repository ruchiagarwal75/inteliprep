import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST as start } from "@/app/api/interview/start/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as resume } from "@/app/api/interview/resume/route";
import { POST as end } from "@/app/api/interview/end/route";
import { interviewStartSchema } from "@/lib/interview-selection";
import { postChatTurn } from "@/lib/post-chat-turn";
import { reconnectInterview } from "@/lib/reconnect-interview";
import {
  InterviewSyncError,
  INTERVIEW_TRANSCRIPT_CHANGED,
} from "@/lib/interview-sync";
import { newSavedInterview, updateSavedInterview } from "@/lib/saved-interview";
import { createInterviewStorage } from "@/lib/interview-storage";
import { whiteboardFixture } from "@/lib/fixtures/whiteboard-test";
import {
  gradingSelection,
  scorecardFixture,
} from "@/lib/fixtures/scorecard-test";
import { redisSessionCommand } from "@/lib/fixtures/redis-session-test";

const mocks = vi.hoisted(() => ({ redis: vi.fn(), grade: vi.fn() }));
vi.mock("@/lib/redis-rest", () => ({ redisCommand: mocks.redis }));
vi.mock("@/lib/llm", () => ({
  hasApiKey: () => true,
  streamInterviewerReply: async function* () {
    yield "Take your time drawing.";
  },
}));
vi.mock("@/lib/phase-assessment", () => ({
  assessPhaseCoverage: async () => [],
}));
vi.mock("@/lib/interview-grading", () => ({ gradeInterview: mocks.grade }));
const bodyRequest = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const request: typeof fetch = async (url, init) => {
  const handlers: Record<string, typeof chat> = {
    "/api/chat": chat,
    "/api/interview/resume": resume,
    "/api/interview/end": end,
  };
  return handlers[String(url)](
    new Request("http://localhost" + String(url), init),
  );
};
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  for (const [key, value] of Object.entries({
    INTELIPREP_ENV: "beta",
    OPENAI_KEY: "test-key",
    INTERVIEW_RESUME_SECRET: "s".repeat(32),
    UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  }))
    vi.stubEnv(key, value);
  mocks.redis.mockReset().mockImplementation(redisSessionCommand(new Map()));
  mocks.grade.mockReset().mockResolvedValue(scorecardFixture());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("recovers a stale tab from Redis, keeps its unsent work, then can chat and end", async () => {
  const interview = interviewStartSchema.parse(
    await (await start(bodyRequest(gradingSelection))).json(),
  );
  const saved = newSavedInterview(interview, whiteboardFixture());
  const firstMessage = {
    role: "user" as const,
    content: "I will measure the existing server.",
    action: "draw" as const,
  };
  const tabA = await postChatTurn(
    request,
    { ...interview, messages: [interview.openingMessage, firstMessage] },
    vi.fn(),
    vi.fn(),
  );
  const unsent = {
    role: "user" as const,
    content: "My answer from the other tab.",
  };
  const stale = {
    ...saved,
    messages: [...saved.messages, unsent],
    pendingReply: { messageIndex: 1 },
    draftText: "A separate draft to preserve.",
    transcriptConflict: true,
  };
  await expect(
    postChatTurn(
      request,
      { ...interview, messages: stale.messages },
      vi.fn(),
      vi.fn(),
    ),
  ).rejects.toBeInstanceOf(InterviewSyncError);
  const failedEnd = await end(
    bodyRequest({ ...interview, messages: stale.messages }),
  );
  expect(failedEnd.status).toBe(409);
  expect(await failedEnd.json()).toMatchObject({
    code: INTERVIEW_TRANSCRIPT_CHANGED,
    ended: false,
  });
  expect(mocks.grade).not.toHaveBeenCalled();
  const restored = await reconnectInterview(stale, request);
  expect(restored.messages).toEqual([
    interview.openingMessage,
    firstMessage,
    { role: "assistant", content: tabA.reply },
  ]);
  expect(restored.pendingReply).toBeUndefined();
  expect(restored.transcriptConflict).toBeUndefined();
  expect(restored.recoveredMessages).toEqual([unsent.content]);
  expect(restored.draftText).toBe(stale.draftText);
  expect(restored.whiteboard).toBe(stale.whiteboard);
  const storage = createInterviewStorage(crypto.randomUUID());
  await storage.saveInterview(restored);
  const reopened = await storage.readInterview(saved.id);
  expect(reopened?.messages).toEqual(restored.messages);
  expect(reopened?.recoveredMessages).toEqual([unsent.content]);
  const sent = [
    ...restored.messages,
    { role: "user" as const, content: "I would test a server failure." },
  ];
  const next = await postChatTurn(
    request,
    { ...restored.interview, messages: sent },
    vi.fn(),
    vi.fn(),
  );
  const completed = next.listening
    ? sent
    : [...sent, { role: "assistant" as const, content: next.reply }];
  const scored = await end(
    bodyRequest({
      ...restored.interview,
      resumeToken: next.resumeToken,
      messages: completed,
    }),
  );
  expect(scored.status).toBe(200);
  expect(mocks.grade).toHaveBeenCalledOnce();
  const finished = await reconnectInterview(stale, request);
  expect(finished.hasEnded).toBe(true);
  expect(finished.scorecard).toBeDefined();
  expect(finished.messages).toEqual(completed);
  storage.deactivate();
});
it("repairs a locally marked ending when the server has not ended the interview", async () => {
  const interview = interviewStartSchema.parse(
    await (await start(bodyRequest(gradingSelection))).json(),
  );
  const saved = newSavedInterview(interview, whiteboardFixture());
  const locallyEnded = updateSavedInterview(
    saved,
    {
      hasEnded: true,
      endRequest: {
        ...interview,
        sessionId: interview.sessionId,
        messages: [interview.openingMessage],
      },
      gradingError: "Old conflict",
    },
    saved.whiteboard,
  );
  const restored = await reconnectInterview(locallyEnded, request);
  expect(restored.hasEnded).toBe(false);
  expect(restored.endRequest).toBeUndefined();
  expect(restored.gradingError).toBeUndefined();
});
