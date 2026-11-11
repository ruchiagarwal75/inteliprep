import { expect, it, vi } from "vitest";
import {
  hasInternalIdentifiers,
  publicInterviewerReply,
} from "@/lib/public-interviewer-reply";
import { streamInterviewerReply } from "@/lib/llm";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create: model } }),
  interviewerModel: () => "test-model",
}));
it.each([
  "fresh:abc123",
  "permissions|cache",
  "revocation_check",
  "a28f039ce7d442e9",
])("blocks internal notation: %s", async (reply) => {
  expect(hasInternalIdentifiers(reply)).toBe(true);
  const seen: string[] = [];
  const read = async () => {
    for await (const part of publicInterviewerReply(
      (async function* () {
        yield reply.slice(0, 3);
        yield reply.slice(3);
      })(),
    ))
      seen.push(part);
  };
  await expect(read()).rejects.toThrow("Please retry");
  expect(seen).toEqual([]);
});
it("keeps natural technical language eligible", () => {
  expect(
    hasInternalIdentifiers(
      "How does the vector DB enforce ACL checks across API servers?",
    ),
  ).toBe(false);
});
it("blocks a malformed stubbed model reply at the final delivery boundary", async () => {
  model.mockImplementation(async function* () {
    yield {
      type: "response.output_text.delta",
      delta: "Explain fresh:0a9f8c7d|acl_filter?",
    };
    yield { type: "response.completed" };
  });
  const seen: string[] = [];
  await expect(
    (async () => {
      for await (const part of streamInterviewerReply(
        [{ role: "user", content: "I filter retrieval by permissions." }],
        "",
        "",
      ))
        seen.push(part);
    })(),
  ).rejects.toThrow("Please retry");
  expect(seen).toEqual([]);
});
