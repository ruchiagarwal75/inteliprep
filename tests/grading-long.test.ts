import { expect, it, vi } from "vitest";
import { APIConnectionTimeoutError } from "openai";
import { z } from "zod";
import fixture from "./fixtures/genai-grading-long.json";
import { chatMessageSchema } from "@/lib/chat";
import { getProblem } from "@/lib/problems";
import { gradeInterview } from "@/lib/interview-grading";
import { fixtureScene } from "./live/genai-fixture";
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: mock.request,
}));
it("fits a long adaptive interview without truncating the transcript or raising the input cap", async () => {
  const problem = getProblem(fixture.problemId);
  if (!problem) throw Error("Missing problem");
  const messages = z.array(chatMessageSchema).parse(fixture.messages);
  mock.request.mockRejectedValue(new APIConnectionTimeoutError());
  await expect(
    gradeInterview(
      problem,
      "senior",
      { messages, scene: fixtureScene(fixture.nodes, fixture.edges) },
      new Date().toISOString(),
    ),
  ).rejects.toBeInstanceOf(APIConnectionTimeoutError);
  expect(mock.request).toHaveBeenCalledOnce();
  const data = JSON.parse(mock.request.mock.calls[0][1].input[0].content);
  expect(data.transcript.map((m: { content: string }) => m.content)).toEqual(
    messages.map((m) => m.content),
  );
  expect(
    data.candidate_quotes.every((q: { quote: string }) => q.quote.length <= 49),
  ).toBe(true);
});
