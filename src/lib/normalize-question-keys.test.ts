import { createCipheriv, createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { normalizeQuestionKeys } from "./normalize-question-keys";
import { internalQuestionKey } from "./internal-question-key";
import { parseSharedRecord } from "./shared-session-record";
import { unsealSession } from "./session-token";
import { getCachedSession, insertSession } from "./interview-session-store";
import { importSessionRecord } from "./interview-session-record";
import { savedFixture } from "./fixtures/saved-interview-test";
import { scorecardFixture } from "./fixtures/scorecard-test";
import { savedInterviewSchema } from "./saved-interview";
import { disclosedGenaiFacts } from "./genai-facts";
import { eligibleDiscussionProbes } from "./genai-probe-memory";
import { globalTopicCounts } from "./topic-memory";
import { getProblem } from "./problems";
const id = "11111111-1111-4111-8111-111111111111";
const checkpoint = {
  id,
  ownerUserId: id,
  problemId: "enterprise-rag-assistant",
  level: "senior" as const,
  phaseIndex: 2,
  coveredCriteria: [0],
  openQuestions: [
    {
      id: "1234567890abcdef",
      question: "How do you handle cold-start?",
      afterMessageIndex: 0,
      topicId: "cold-start",
    },
  ],
  coveredTopics: [
    "issue:cache",
    "injection",
    "I validate the permission revision on every request.",
  ],
  topicTurnCounts: {
    "core-design:cache": 2,
    "cache|caching": 1,
    "mmq7-cache": 2,
    cache: 1,
    "fresh:7179b8dadc8f7599": 1,
  },
};
function legacyToken() {
  const context = "inteliprep/browser-resume/v1";
  vi.stubEnv("INTERVIEW_RESUME_SECRET", "legacy-unit-fixture-secret");
  const key = createHash("sha256")
    .update(context)
    .update("legacy-unit-fixture-secret")
    .digest();
  const iv = Buffer.alloc(12, 7),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(checkpoint), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}
afterEach(() => vi.unstubAllEnvs());
it("normalizes old keys without changing questions or resetting/doubling budgets", () => {
  const before = structuredClone(checkpoint),
    next = normalizeQuestionKeys(checkpoint);
  expect(next.openQuestions?.[0]).toEqual({
    ...checkpoint.openQuestions[0],
    topicId: "mmq7-cold-start",
  });
  expect(next.coveredTopics).toEqual([
    "issue:mmq7-cache",
    "mmq7-injection",
    checkpoint.coveredTopics[2],
  ]);
  expect(next.topicTurnCounts).toMatchObject({
    "core-design:mmq7-cache": 2,
    "mmq7-cache": 2,
    [internalQuestionKey("cache|caching")]: 1,
    "fresh:7179b8dadc8f7599": 1,
  });
  expect(normalizeQuestionKeys(next)).toEqual(next);
  expect(checkpoint).toEqual(before);
});
it("reads real old-format sealed browser checkpoints and Redis JSON", () => {
  const recovered = unsealSession(legacyToken());
  expect(recovered.openQuestions?.[0].topicId).toBe("mmq7-cold-start");
  expect(recovered.phaseIndex).toBe(2);
  expect(recovered.coveredCriteria).toEqual([0]);
  const transcript = {
    messages: [
      { role: "user", content: "My request uses user_id and a retry queue." },
    ],
  };
  const card = scorecardFixture();
  const record = parseSharedRecord(
    JSON.stringify({ checkpoint, transcript, scorecard: card }),
  );
  expect(record.checkpoint.topicTurnCounts?.["core-design:mmq7-cache"]).toBe(2);
  expect(record.transcript).toEqual(transcript);
  expect(record.scorecard).toEqual(card);
});
it("keeps older in-memory and imported sessions usable", () => {
  insertSession({ ...checkpoint, updatedAt: Date.now(), busy: false });
  expect(getCachedSession(id)?.openQuestions?.[0].topicId).toBe(
    "mmq7-cold-start",
  );
  importSessionRecord(id, { checkpoint });
  expect(
    getCachedSession(id)?.topicTurnCounts?.["core-design:mmq7-cache"],
  ).toBe(2);
});
it("keeps past browser interviews, scorecards, drafts, drawings and opaque tokens intact", () => {
  const saved = savedFixture();
  const token = legacyToken();
  const old = {
    ...saved,
    hasEnded: true,
    scorecard: scorecardFixture(),
    draftText: "Unsent design",
    interview: { ...saved.interview, resumeToken: token },
  };
  const restored = savedInterviewSchema.parse(old);
  expect(restored.interview.resumeToken).toBe(token);
  expect(restored.whiteboard).toEqual(old.whiteboard);
  expect(restored.messages).toEqual(old.messages);
  expect(restored.scorecard).toEqual(old.scorecard);
  expect(restored.draftText).toBe("Unsent design");
});
it("recognizes facts already disclosed in an old transcript under their new IDs", () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing problem");
  expect(
    disclosedGenaiFacts(problem, "senior", [
      { role: "assistant", content: "20,000 employees." },
    ]).map((f) => f.id),
  ).toContain("mmq7-employees");
});

it("keeps previously answered issues closed and their cross-stage limits", () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw Error("Missing problem");
  const state = normalizeQuestionKeys(checkpoint);
  const available = eligibleDiscussionProbes(
    problem.track,
    problem.reviewProbes,
    {
      askedQuestions: [],
      coveredTopics: state.coveredTopics ?? [],
      topicTurns: globalTopicCounts(state.topicTurnCounts, problem),
    },
  );
  expect(available.some((probe) => probe.id === "mmq7-injection")).toBe(false);
  expect(available.some((probe) => probe.id === "mmq7-cache")).toBe(false);
});
