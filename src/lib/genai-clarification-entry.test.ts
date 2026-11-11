import { beforeEach, expect, it, vi } from "vitest";
import { streamInterviewerReply } from "@/lib/llm";
import { getProblem } from "@/lib/problems";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observed-model-request", () => ({
  observedModelRequest: model,
}));
beforeEach(() => {
  model.mockReset();
});
const examples = [
  {
    problemId: "enterprise-rag-assistant",
    message: "Tell me the expected traffic.",
    id: "mmq7-questions",
    expected: "100K questions",
  },
  {
    problemId: "enterprise-rag-assistant",
    message: "I'd like to know how many users there are.",
    id: "mmq7-employees",
    expected: "20,000 employees",
  },
  {
    problemId: "ai-chat-assistant",
    message: "Whats the dau",
    id: "mmq7-dau",
    expected: "20M",
  },
];
it.each(examples)(
  "classifies a clarification statement: $message",
  async (row) => {
    const problem = getProblem(row.problemId);
    if (!problem) throw new Error("Missing problem");
    model.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({
        intent: "facts",
        factIds: [row.id],
        hasUnspecified: false,
      }),
    });
    let reply = "";
    for await (const part of streamInterviewerReply(
      [{ role: "user", content: row.message }],
      "Empty whiteboard.",
      "No changes.",
      undefined,
      undefined,
      {
        problem,
        level: "senior",
        phase: problem.phases[0],
        mayInviteDrawing: false,
        progress: {
          step: "discussion",
          candidateTurns: 1,
          discussionTurnLimit: 99,
        },
      },
    ))
      reply += part;
    expect(reply).toContain(row.expected);
    expect(model).toHaveBeenCalledTimes(1);
    expect(model.mock.lastCall?.[1].text.format.name).toBe(
      "genai_fact_selection",
    );
  },
);
it("lets other intent continue without answering a fact", async () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw new Error("Missing problem");
  model.mockImplementation(async (_operation, request) =>
    request.text?.format?.name === "genai_fact_selection"
      ? {
          status: "completed",
          output_text: JSON.stringify({
            intent: "other",
            factIds: [],
            hasUnspecified: false,
          }),
        }
      : (async function* () {
          yield {
            type: "response.output_text.delta",
            delta: "What tradeoff are you making?",
          };
          yield { type: "response.completed" };
        })(),
  );
  let reply = "";
  for await (const part of streamInterviewerReply(
    [{ role: "user", content: "I would separate retrieval from generation." }],
    "Empty whiteboard.",
    "",
    undefined,
    undefined,
    {
      problem,
      level: "senior",
      phase: problem.phases[0],
      mayInviteDrawing: false,
      progress: {
        step: "discussion",
        candidateTurns: 1,
        discussionTurnLimit: 99,
      },
    },
  ))
    reply += part;
  expect(
    model.mock.calls.filter(
      (c) => c[1].text?.format?.name === "genai_fact_selection",
    ),
  ).toHaveLength(1);
  expect(reply).not.toMatch(/20,000|5M documents/);
});

it("keeps a repeated friendly classifier-failure reply nonempty", async () => {
  const problem = getProblem("enterprise-rag-assistant");
  if (!problem) throw new Error("Missing problem");
  model
    .mockRejectedValueOnce(new Error("Timeout"))
    .mockRejectedValueOnce(new Error("Timeout"));
  let reply = "";
  for await (const part of streamInterviewerReply(
    [
      { role: "assistant", content: "Could you rephrase that?" },
      { role: "user", content: "Tell me the expected traffic." },
    ],
    "Empty whiteboard.",
    "",
    undefined,
    undefined,
    {
      problem,
      level: "senior",
      phase: problem.phases[0],
      mayInviteDrawing: false,
      progress: {
        step: "discussion",
        candidateTurns: 2,
        discussionTurnLimit: 99,
      },
    },
  ))
    reply += part;
  expect(reply).toBe("Could you ask that in a different way?");
  expect(model).toHaveBeenCalledTimes(2);
});
