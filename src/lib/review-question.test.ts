import { beforeEach, expect, it, vi } from "vitest";
import { reviewQuestion } from "@/lib/review-question";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create } }),
  interviewerModel: () => "test-model",
}));
const problem = getProblem("file-storage");
if (!problem) throw new Error("Missing problem");
const messages = [
  {
    role: "user" as const,
    content:
      "The upload stays pending and invisible until its complete bytes are verified and the metadata is published.",
  },
];
const draft = "How do incomplete uploads stay hidden?";
const context = {
  problem,
  level: "mid" as const,
  phase: problem.phases[2],
  coveredCriteria: [0, 1],
};
const result = (
  alreadyAnswered: boolean,
  answerQuote = "",
  replacementQuestion = "",
  acknowledgement = "",
  acknowledgementQuote = "",
) => ({
  status: "completed",
  output_text: JSON.stringify({
    alreadyAnswered,
    answerMessageIndex: alreadyAnswered ? 0 : -1,
    answerQuote,
    replacementQuestion,
    followsLatestReply: true,
    withinStage: true,
    acknowledgement,
    acknowledgementQuote,
  }),
});
beforeEach(() => {
  create.mockReset();
});
it("removes verbatim candidate text from both a draft and the reviewed acknowledgement", async () => {
  const answer =
    "I expire download links within 60 seconds to bound access after a grant is revoked.";
  const history = [
    { role: "assistant" as const, content: "How do you revoke downloads?" },
    { role: "user" as const, content: answer },
  ];
  create.mockResolvedValueOnce(result(false, "", "", `"${answer}"`, answer));
  const reply = await reviewQuestion(
    `"${answer}" How would you test the expiry bound?`,
    history,
    context,
  );
  expect(reply).toBe("How would you test the expiry bound?");
  expect(reply).not.toContain(answer);
});
it("replaces a repeat only after checking an exact earlier candidate answer", async () => {
  create.mockResolvedValueOnce(
    result(
      true,
      messages[0].content,
      "What happens if the process crashes between completing bytes and publishing metadata?",
    ),
  );
  create.mockResolvedValueOnce(result(false));
  expect(await reviewQuestion(draft, messages, context)).toContain(
    "crashes between",
  );
  expect(
    JSON.parse(create.mock.calls[0][0].input).candidate_quotes[0].quote,
  ).toBe(messages[0].content);
});
it("retains a distinct unanswered question and uses a safe probe when review invents evidence", async () => {
  create.mockResolvedValueOnce(result(false));
  expect(await reviewQuestion(draft, messages, context)).toBe(draft);
  create.mockResolvedValueOnce(
    result(
      true,
      "They already implemented full recovery.",
      "How does recovery work?",
    ),
  );
  create.mockResolvedValueOnce({
    status: "completed",
    output_text: JSON.stringify({
      topicId: problem.reviewProbes.find((p) => p.stageIndex === 2)?.id,
      quoteId: "m0q0",
      question:
        "What happens if metadata publication fails after byte verification?",
      exhausted: false,
    }),
  });
  const replacement = await reviewQuestion(draft, messages, context);
  expect(replacement).not.toContain("implemented full recovery");
  expect(replacement).not.toBe(draft);
  expect(replacement).toContain("metadata publication");
  expect(replacement).not.toContain("Pause to draw");
});
it("skips the extra request when there is no candidate evidence or question", async () => {
  expect(
    await reviewQuestion("Thanks for explaining.", messages, context),
  ).toBe("Thanks for explaining.");
  expect(await reviewQuestion(draft, [], context)).toBe(draft);
  expect(create).not.toHaveBeenCalled();
});
it("checks replacement questions too instead of swapping one repeated topic for another", async () => {
  create.mockResolvedValueOnce(
    result(true, messages[0].content, "How do pending uploads stay invisible?"),
  );
  create.mockResolvedValueOnce(
    result(true, messages[0].content, "How is read access revoked?"),
  );
  create.mockResolvedValueOnce(result(false));
  expect(await reviewQuestion(draft, messages, context)).toBe(
    "How is read access revoked?",
  );
  expect(create).toHaveBeenCalledTimes(3);
});
it("filters a real streamed discussion reply to one plain question before evidence review", async () => {
  create.mockImplementation(async (input: { stream?: boolean }) =>
    input.stream
      ? (async function* () {
          yield {
            type: "response.output_text.delta",
            delta:
              "1. **Sharing:**\nHow is a read grant checked?\n2. **Retries:**\nHow do you retry?",
          };
          yield { type: "response.completed" };
        })()
      : result(false),
  );
  let text = "";
  for await (const delta of streamInterviewerReply(
    [
      ...messages,
      {
        role: "user",
        content: "I've finished explaining.",
        action: "review",
        source: "control",
      },
    ],
    "File API and storage",
    "No changes",
    undefined,
    undefined,
    {
      ...context,
      progress: { step: "review", candidateTurns: 2, discussionTurnLimit: 3 },
    },
  ))
    text += delta;
  expect(text).toBe("How is a read grant checked?");
  expect(create).toHaveBeenCalledTimes(2);
});
it("rejects a topic jump after a revocation answer and continues the actual answer", async () => {
  const history = [
    {
      role: "assistant" as const,
      content: "How do you handle revoked grants?",
    },
    {
      role: "user" as const,
      content:
        "I use 60-second presigned URLs to bound access after revocation.",
    },
  ];
  const body = JSON.parse(result(false).output_text);
  create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({ ...body, followsLatestReply: false }),
    })
    .mockResolvedValue(result(false));
  const reply = await reviewQuestion(
    "What happens to uploads above the 1 GB limit?",
    history,
    { ...context, phase: problem.phases[3] },
  );
  expect(reply).toContain("your expiring download links");
  expect(reply).not.toContain("Thanks for explaining.");
  expect(reply).toContain("revocation bound");
  expect(reply).not.toContain("1 GB");
  const input = JSON.parse(create.mock.calls[0][0].input);
  expect(input.previous_interviewer_question).toBe(history[0].content);
  expect(input.latest_candidate_reply.content).toBe(history[1].content);
});

it("rejects a scaling probe during core design and selects an unasked core question", async () => {
  const body = JSON.parse(result(false).output_text);
  create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({ ...body, withinStage: false }),
    })
    .mockResolvedValue(result(false));
  const reply = await reviewQuestion(
    "Which metrics reveal a multi-region outage?",
    messages,
    context,
  );
  expect(reply).not.toContain("multi-region");
  expect(reply).toMatch(
    /metadata publication|stale-version|integrity|upload-complete|same version/iu,
  );
});

it("checks a bank fallback against earlier ID leasing evidence before publishing it", async () => {
  const p = getProblem("url-shortener");
  if (!p) throw Error("Missing problem");
  const content =
    "Atomic reservations lease disjoint ID ranges and client idempotency with a conditional insert makes concurrent creates safe.";
  const history = [{ role: "user" as const, content }];
  const ctx = {
    ...context,
    problem: p,
    phase: p.phases[2],
    questionMemory: { askedQuestions: [], coveredTopics: [] as string[] },
  };
  const bad = JSON.parse(result(false).output_text);
  create
    .mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify({ ...bad, withinStage: false }),
    })
    .mockResolvedValueOnce(
      result(
        true,
        content,
        "How does a lookup distinguish a missing mapping from a temporarily unavailable store?",
      ),
    )
    .mockResolvedValueOnce(result(false));
  const reply = await reviewQuestion(
    "Which monitoring metric would you use?",
    history,
    ctx,
  );
  expect(reply).toContain("lookup distinguish");
  expect(reply).not.toContain("two create requests");
  expect(JSON.parse(create.mock.calls[1][0].input).proposed_question).toContain(
    "two create requests",
  );
  expect(ctx.questionMemory.coveredTopics).toContain(
    "What happens if two create requests are processed at the same time?",
  );
});
