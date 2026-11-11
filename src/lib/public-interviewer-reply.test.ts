import { expect, it, vi } from "vitest";
import {
  configuredInternalTopicIds,
  hasInternalIdentifiers,
  publicInterviewerReply,
} from "@/lib/public-interviewer-reply";
import { streamInterviewerReply } from "@/lib/llm";
import { getProblem } from "@/lib/problems";
import type { InterviewContext } from "@/lib/interview-instructions";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create: model } }),
  interviewerModel: () => "test-model",
}));
const problem = getProblem("enterprise-rag-assistant");
if (!problem) throw Error("Missing problem");
const topicIds = configuredInternalTopicIds(problem.reviewProbes);
async function read(text: string, ids = topicIds) {
  let reply = "";
  for await (const part of publicInterviewerReply(
    (async function* () {
      for (const character of text) yield character;
    })(),
    { topicIds: ids },
  ))
    reply += part;
  return reply;
}
it.each([
  "How would you shard the table by user_id?",
  "What happens if two writers update the same doc_id with different acl_version values?",
  "Where does the created_at index help?",
  "What do p50 | p95 look like?",
  "What does the 3fa85f64 request ID tell you?",
])("keeps normal interviewer text unchanged: %s", async (text) => {
  expect(hasInternalIdentifiers(text, topicIds)).toBe(false);
  expect(await read(text)).toBe(text);
});
it.each([
  "Walk me through fresh:7179b8dadc8f7599 in your design.",
  "How does cache|caching work?",
  "What does loop|steps?|limits? mean?",
])("drops an internal-key sentence without throwing: %s", async (text) => {
  const ids = [...topicIds, "loop|steps?|limits?"];
  expect(hasInternalIdentifiers(text, ids)).toBe(true);
  expect(await read(text, ids)).toBe("");
});
it("keeps surrounding safe sentences and treats configured keys literally", async () => {
  expect(
    await read(
      "How are users authenticated? Walk me through fresh:7179b8dadc8f7599 in your design. What does the cache store?",
    ),
  ).toBe("How are users authenticated? What does the cache store?");
  expect(await read("How does cache|caching_extra work?")).toBe(
    "How does cache|caching_extra work?",
  );
  expect(await read("Is this fresh: fruit or a bare deadbeef value?")).toBe(
    "Is this fresh: fruit or a bare deadbeef value?",
  );
});
it("releases a safe sentence before the source finishes", async () => {
  let release = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const stream = publicInterviewerReply(
    (async function* () {
      yield "A safe sentence. ";
      await wait;
      yield "What comes next?";
    })(),
  );
  expect(await stream.next()).toEqual({
    done: false,
    value: "A safe sentence. ",
  });
  release();
  expect(await stream.next()).toEqual({
    done: false,
    value: "What comes next?",
  });
  expect((await stream.next()).done).toBe(true);
});
it("keeps a safe fallback when a stubbed model returns only an internal ID", async () => {
  model.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta: "Walk me through fresh:7179b8dadc8f7599 in your design.",
    };
    yield { type: "response.completed" };
  });
  let reply = "";
  for await (const part of streamInterviewerReply(
    [{ role: "user", content: "I filter retrieval by permissions." }],
    "",
    "",
  ))
    reply += part;
  expect(reply).not.toContain("fresh:");
  expect(reply).toMatch(/\?/u);
});
it("streams a checked model sentence before the model completes", async () => {
  let release = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  model.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta: "The requests reach the API. ",
    };
    await wait;
    yield {
      type: "response.output_text.delta",
      delta: "Where does the created_at index help?",
    };
    yield { type: "response.completed" };
  });
  const stream = streamInterviewerReply(
    [{ role: "user", content: "I store the rows." }],
    "",
    "",
  );
  expect((await stream.next()).value).toBe("The requests reach the API.");
  release();
  let rest = "";
  for await (const part of stream) rest += part;
  expect(rest).toBe(" Where does the created_at index help?");
});
it("removes literal configured topic keys on the interview path", async () => {
  let reply = "";
  const context: InterviewContext = {
    problem,
    level: "senior",
    reviewQuestion: "How does cache|caching work?",
    selectedTopic: "fresh:7179b8dadc8f7599",
    continuedQuestionId: "old-question",
  };
  for await (const part of streamInterviewerReply(
    [{ role: "user", content: "I scope cached answers to permissions." }],
    "",
    "",
    undefined,
    undefined,
    context,
  ))
    reply += part;
  expect(reply).not.toContain("cache|caching");
  expect(reply).toMatch(/\?/u);
  expect(context.selectedTopic).not.toMatch(/^fresh:/u);
  expect(context.continuedQuestionId).toBeUndefined();
});
