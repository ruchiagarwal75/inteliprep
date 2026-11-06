import { expect, it } from "vitest";
import {
  interviewerReplyFilter,
  plainInterviewerText,
} from "@/lib/interviewer-reply-filter";

it.each([1, 5, 500])(
  "keeps one plain-text question across %i-character chunks",
  (size) => {
    const source =
      "1. **Idempotency and Notification Jobs:**\nHow do you deduplicate a request?\n2. **Retries:**\nWhat happens after a timeout?";
    const filter = interviewerReplyFilter();
    let text = "";
    for (let i = 0; i < source.length; i += size)
      text += filter.push(source.slice(i, i + size));
    text += filter.finish();
    expect(text).toBe("How do you deduplicate a request?");
    expect(text.match(/\?/gu)).toHaveLength(1);
  },
);
it("retains useful statements and makes text formatting safe without rendering HTML", () => {
  expect(
    plainInterviewerText("## Review\n**Use** a `version` and *status*."),
  ).toBe("Review\nUse a version and status.");
  const filter = interviewerReplyFilter();
  expect(filter.push("The upload is pending. ")).toBe("The upload is pending.");
  expect(filter.push("What if verification fails? How do you retry?")).toBe(
    " What if verification fails?",
  );
  expect(filter.finish()).toBe("");
});
it("does not leak bold markup even when the first question ends before closing stars", () => {
  const filter = interviewerReplyFilter();
  expect(filter.push("**What happens after a timeout?**")).toBe(
    "What happens after a timeout?",
  );
});
