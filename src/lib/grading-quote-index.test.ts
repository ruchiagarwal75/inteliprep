import { expect, it } from "vitest";
import { candidateQuotes } from "@/lib/scorecard-quotes";
import { gradingQuoteIndex } from "@/lib/grading-quote-index";
import type { ChatMessage } from "@/lib/chat";
it("keeps every quote locator while preserving full evidence outside the provider index", () => {
  const content =
    "The API validates the employee identity and current group membership before retrieval, then checks the document version and permissions again before returning any citation.";
  const messages: ChatMessage[] = [{ role: "user", content }];
  const full = candidateQuotes(messages),
    index = gradingQuoteIndex(messages);
  expect(index.map(({ quoteId }) => quoteId)).toEqual(
    full.map(({ quoteId }) => quoteId),
  );
  expect(index[0].quote.length).toBeLessThan(full[0].quote.length);
  expect(full[0].quote).toBe(content);
  expect(messages[0].content).toBe(content);
});
