import { expect, it } from "vitest";
import {
  questionMemory,
  sameQuestion,
  trimAcknowledgements,
} from "@/lib/question-memory";
it("retains questions outside the provider's short history window", () => {
  const memory = questionMemory(
    [
      { role: "assistant", content: "How does a popular short link behave?" },
      ...Array.from({ length: 30 }, () => ({
        role: "user" as const,
        content: "More design details.",
      })),
    ],
    ["ID leasing", "ID leasing"],
  );
  expect(memory.askedQuestions).toEqual([
    "How does a popular short link behave?",
  ]);
  expect(memory.coveredTopics).toEqual(["ID leasing"]);
});
it("rejects paraphrases without blocking a distinct failure boundary", () => {
  expect(
    sameQuestion(
      "How does your design behave when a short link becomes unusually popular?",
      "What happens in your design when a short link becomes unusually popular?",
    ),
  ).toBe(true);
  expect(
    sameQuestion("How do you create an ID?", "How do you read an ID?"),
  ).toBe(false);
});
it("keeps only one acknowledgement and preserves critical feedback and paragraph spacing", () => {
  expect(
    trimAcknowledgements(
      "You've explained ID leasing. Your ID leasing indicates strong reasoning. What happens when a lease expires?",
    ),
  ).toBe("You've explained ID leasing. What happens when a lease expires?");
  expect(
    trimAcknowledgements(
      "That claim conflicts with the write path.\n\nHow is a retry safe?",
    ),
  ).toBe("That claim conflicts with the write path.\n\nHow is a retry safe?");
});

it("also trims duplicate acknowledgements with typographic apostrophes", () => {
  expect(
    trimAcknowledgements(
      "You’ve explained ID leasing. This is a strong approach. What happens when the lease expires?",
    ),
  ).toBe("You’ve explained ID leasing. What happens when the lease expires?");
});

it("detects a repeated final question after a different factual answer", async () => {
  const { repeatsLastQuestion } = await import("@/lib/question-memory");
  const history = [
    {
      role: "assistant" as const,
      content: "Some facts. What happens if Redis fails?",
    },
    { role: "user" as const, content: "Is authentication already handled?" },
  ];
  expect(
    repeatsLastQuestion(
      "Yes, authentication already exists. What happens if Redis fails?",
      history,
    ),
  ).toBe(true);
  expect(
    repeatsLastQuestion(
      "What would a caller receive during that failure?",
      history,
    ),
  ).toBe(false);
});

it("extracts the final question from a long prior answer without quadratic scanning", async () => {
  const { questionAtEnd } = await import("@/lib/open-question");
  const prefix = "x".repeat(32000);
  const started = performance.now();
  expect(questionAtEnd("?")).toBe("?");
  expect(questionAtEnd("？")).toBe("？");
  expect(questionAtEnd(prefix)).toBeUndefined();
  expect(questionAtEnd(prefix + ". What happens on failover? ")).toBe(
    "What happens on failover?",
  );
  expect(performance.now() - started).toBeLessThan(1000);
});
