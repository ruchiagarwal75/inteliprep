import { expect, it } from "vitest";
import {
  enqueueQuestion,
  pendingQuestions,
  unresolvedQuestions,
  verifiedQuestionAnswers,
} from "@/lib/open-question-queue";
it("keeps FIFO questions across a side clarification and deduplicates a resumed ask", () => {
  const first = enqueueQuestion([], "How are distinct IDs allocated?", 2);
  const both = enqueueQuestion(
    first,
    "Which database reflects your intended design?",
    4,
  );
  expect(enqueueQuestion(both, first[0].question, 6)).toEqual(both);
  expect(unresolvedQuestions(both, [])[0].question).toBe(first[0].question);
  expect(unresolvedQuestions(both, [first[0].id])[0].question).toContain(
    "database",
  );
});
it("accepts only post-question candidate quote references, never old or invented evidence", () => {
  const queue = enqueueQuestion([], "How do you allocate distinct IDs?", 4);
  const id = queue[0].id;
  expect(
    verifiedQuestionAnswers(
      queue,
      [
        { questionId: id, quoteId: "old" },
        { questionId: id, quoteId: "made-up" },
      ],
      [{ quoteId: "old", messageIndex: 1, quote: "Earlier IDs" }],
    ),
  ).toEqual([]);
  expect(
    verifiedQuestionAnswers(
      queue,
      [{ questionId: id, quoteId: "new" }],
      [
        {
          quoteId: "new",
          messageIndex: 6,
          quote: "ZooKeeper grants disjoint ranges.",
        },
      ],
    ),
  ).toEqual([id]);
});
it("reads an existing single-slot checkpoint without changing its transcript", () => {
  const messages = [
    {
      role: "assistant" as const,
      content: "What happens if ZooKeeper goes down?",
    },
  ];
  const q = pendingQuestions({ openQuestion: messages[0].content }, messages);
  expect(q[0].afterMessageIndex).toBe(0);
  expect(messages).toHaveLength(1);
  expect(
    pendingQuestions(
      { openQuestions: [], openQuestion: messages[0].content },
      messages,
    ),
  ).toEqual([]);
  expect(enqueueQuestion([], "Please start drawing.", 0)).toEqual([]);
});
