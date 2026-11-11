import { beforeEach, expect, it, vi } from "vitest";
import { uniqueInterviewerReply } from "@/lib/unique-interviewer-reply";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
beforeEach(() => model.mockReset());
it("drops a repeated acknowledgement and keeps a new question without another call", async () => {
  const messages = [
    { role: "assistant" as const, content: "Got it. How does retrieval work?" },
  ];
  expect(
    await uniqueInterviewerReply(
      "Got it. How are stale results rejected?",
      messages,
    ),
  ).toBe("How are stale results rejected?");
  expect(model).not.toHaveBeenCalled();
});
it("rewrites a repeated factual reply without introducing a canned fallback", async () => {
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      reply: "The target remains 20,000 employees.",
    }),
  });
  expect(
    await uniqueInterviewerReply("There are 20,000 employees.", [
      { role: "assistant", content: "There are 20,000 employees." },
    ]),
  ).toBe("The target remains 20,000 employees.");
});

it("keeps repeated configured facts exact without a provider request", async () => {
  const reply = await uniqueInterviewerReply(
    "There are 20,000 employees. What else do you need?",
    [{ role: "assistant", content: "There are 20,000 employees." }],
    undefined,
    true,
  );
  expect(reply).toBe(
    "To confirm, there are 20,000 employees. What else do you need?",
  );
  expect(model).not.toHaveBeenCalled();
});

it("tells the second rewrite exactly which sentences still repeat", async () => {
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({ reply: "How does retrieval work?" }),
  });
  model.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      reply: "Which step retrieves evidence for a request?",
    }),
  });
  expect(
    await uniqueInterviewerReply("How does retrieval work?", [
      { role: "assistant", content: "How does retrieval work?" },
    ]),
  ).toBe("Which step retrieves evidence for a request?");
  const retry = JSON.parse(model.mock.calls[1][1].input);
  expect(retry.sentences_to_rephrase).toEqual(["How does retrieval work?"]);
  expect(retry.rejected_reply).toBe("How does retrieval work?");
});
