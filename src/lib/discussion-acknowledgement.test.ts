import { expect, it } from "vitest";
import { discussionAcknowledgement } from "@/lib/discussion-acknowledgement";
import { candidateQuotes } from "@/lib/scorecard-quotes";
const messages = [
  { role: "assistant" as const, content: "How are IDs assigned?" },
  {
    role: "user" as const,
    content: "Redis uses a five-minute TTL to reduce database reads.",
  },
];
const quotes = candidateQuotes(messages);
it("accepts a verified latest-answer quote ID, as returned by structured generation", () => {
  expect(
    discussionAcknowledgement(
      messages,
      {
        acknowledgement: "That TTL limits cached data age.",
        acknowledgementQuote: quotes[0].quoteId,
      },
      quotes,
    ),
  ).toBe("That TTL limits cached data age.");
});
it("rejects invented or older-answer quote IDs", () => {
  expect(
    discussionAcknowledgement(
      messages,
      {
        acknowledgement: "That TTL limits cached data age.",
        acknowledgementQuote: "invented",
      },
      quotes,
    ),
  ).toBe("");
  expect(
    discussionAcknowledgement(
      messages,
      {
        acknowledgement: "That TTL limits cached data age.",
        acknowledgementQuote: quotes[0].quoteId,
      },
      quotes.map((q) => ({ ...q, messageIndex: 0 })),
    ),
  ).toBe("");
});

it("omits GenAI judgment transitions even with a valid evidence quote", () => {
  for (const acknowledgement of [
    "The cache configuration remains unspecified.",
    "That approach is incomplete.",
    "That TTL limits cached data age.",
  ]) {
    expect(
      discussionAcknowledgement(
        messages,
        { acknowledgement, acknowledgementQuote: quotes[0].quoteId },
        quotes,
        "genai",
      ),
    ).toBe("");
  }
});
