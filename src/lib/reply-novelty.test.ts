import { expect, it } from "vitest";
import {
  repeatedInterviewerSentences,
  withoutRepeatedSentences,
} from "@/lib/reply-novelty";
it("checks every earlier interviewer sentence, preserving decimal boundaries", () => {
  const messages = [
    {
      role: "assistant" as const,
      content:
        "Peak demand is 3.5 requests per second. What happens during an outage?",
    },
    {
      role: "user" as const,
      content: "Peak demand is 3.5 requests per second.",
    },
  ];
  expect(
    repeatedInterviewerSentences(
      "Peak demand is 3.5 requests per second. How is the index recovered?",
      messages,
    ),
  ).toEqual(["Peak demand is 3.5 requests per second."]);
  expect(
    withoutRepeatedSentences(
      "Peak demand is 3.5 requests per second. How is the index recovered?",
      messages,
    ),
  ).toBe("How is the index recovered?");
});
it("rejects repetition within one reply and ignores candidate-only sentences", () => {
  expect(
    repeatedInterviewerSentences("What fails first? What fails first?", []),
  ).toEqual(["What fails first?"]);
  expect(
    repeatedInterviewerSentences("What fails first?", [
      { role: "user", content: "What fails first?" },
    ]),
  ).toEqual([]);
});
