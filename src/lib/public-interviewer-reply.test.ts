import { beforeEach, expect, it, vi } from "vitest";
import {
  hasInternalIdentifiers,
  publicInterviewerReply,
} from "./public-interviewer-reply";
import { streamInterviewerReply } from "./llm";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create: model } }),
  interviewerModel: () => "test-model",
}));
beforeEach(() => model.mockReset());
async function* chunks(text: string) {
  for (const character of text) yield character;
}
async function read(
  text: string,
  regenerate?: (published: string) => Promise<string>,
) {
  let result = "";
  for await (const part of publicInterviewerReply(chunks(text), { regenerate }))
    result += part;
  return result;
}
it.each([
  "How do you handle the cold-start problem for brand-new videos?",
  "How would you avoid a feedback-loop that keeps showing popular videos?",
  "How do you correct for position-bias in your training data?",
  "Why did offline-online results disagree?",
  "How do you stop click-fraud from polluting your labels?",
  "How would you shard the table by user_id?",
  "What do p50 | p95 look like?",
  "How do you handle long-context requests during a provider-outage?",
  "What happens if two writers update the same doc_id with different acl_version values?",
  "Where does the created_at index help?",
  "What does the 3fa85f64 request ID tell you?",
  "How does cache|caching work?",
])("passes normal design language unchanged: %s", async (text) => {
  expect(hasInternalIdentifiers(text)).toBe(false);
  expect(await read(text)).toBe(text);
});
it.each([
  "Walk me through fresh:7179b8dadc8f7599 in your design.",
  "How does mmq7-cold-start work?",
  "How does MMQ7-unknown_future_key work?",
])("drops a reserved key without an error: %s", async (text) => {
  expect(hasInternalIdentifiers(text)).toBe(true);
  expect(await read(text)).toBe("");
});
it("keeps surrounding sentences, ordinary pipes and non-hash fresh text", async () => {
  expect(
    await read(
      "How are users authenticated? Walk me through fresh:7179b8dadc8f7599 in your design. What does the cache store?",
    ),
  ).toBe("How are users authenticated? What does the cache store?");
  expect(await read("Is this fresh: fruit or a bare deadbeef value?")).toBe(
    "Is this fresh: fruit or a bare deadbeef value?",
  );
});
it("regenerates once if a dropped question follows a safe acknowledgement", async () => {
  const regenerate = vi.fn(
    async () => "How does your ranker handle a video with no watch history?",
  );
  expect(
    await read(
      "The API accepts the request. How does mmq7-cold-start work?",
      regenerate,
    ),
  ).toBe(
    "The API accepts the request.\n\nHow does your ranker handle a video with no watch history?",
  );
  expect(regenerate).toHaveBeenCalledTimes(1);
});
it("does not replace an already safe question or emit a malformed repair", async () => {
  const regenerate = vi.fn(async () => "Explain mmq7-cold-start?");
  expect(
    await read(
      "What does mmq7-cold-start mean? How do users get a recommendation?",
      regenerate,
    ),
  ).toBe("How do users get a recommendation?");
  expect(regenerate).not.toHaveBeenCalled();
  expect(await read("Explain mmq7-cold-start?", regenerate)).toBe("");
  expect(regenerate).toHaveBeenCalledTimes(1);
});
it("releases a safe sentence while the source is still running", async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const stream = publicInterviewerReply(
    (async function* () {
      yield "The requests reach the API. ";
      await gate;
      yield "Where does the created_at index help?";
    })(),
  );
  expect(await stream.next()).toEqual({
    done: false,
    value: "The requests reach the API. ",
  });
  release();
  expect(await stream.next()).toEqual({
    done: false,
    value: "Where does the created_at index help?",
  });
});
it("replaces a malformed model question with one grounded model call, never a canned line", async () => {
  model
    .mockImplementationOnce(async function* () {
      yield {
        type: "response.output_text.delta",
        delta: "I follow the request path. How does mmq7-cold-start work?",
      };
      yield { type: "response.completed" };
    })
    .mockResolvedValueOnce({
      status: "completed",
      output_text:
        "How would your ranker score a video that has no watch history?",
    });
  let reply = "";
  for await (const part of streamInterviewerReply(
    [{ role: "user", content: "I use a ranker and an embedding index." }],
    "A ranker connects to an embedding index.",
    "No changes.",
  ))
    reply += part;
  expect(reply).toContain(
    "How would your ranker score a video that has no watch history?",
  );
  expect(reply).not.toContain("mmq7-");
  expect(reply).toMatch(/\?$/u);
  expect(model).toHaveBeenCalledTimes(2);
  expect(model.mock.lastCall?.[0].input).toContain("embedding index");
});
