import { describe, expect, it } from "vitest";
import { withoutQuestions } from "@/lib/drawing-reply";

describe("withoutQuestions", () => {
  it("preserves a clarification answer while removing another design question", () => {
    expect(
      withoutQuestions(
        "Plan for 1,000 requests per second. How would you reduce CPU load?",
      ),
    ).toBe("Plan for 1,000 requests per second.");
  });
  it("preserves decimal values, acknowledgements, and statements after questions", () => {
    expect(
      withoutQuestions(
        "Aim for 0.5 seconds. What would you change? Take your time.",
      ),
    ).toBe("Aim for 0.5 seconds. Take your time.");
  });
  it("removes question-only replies so the drawing invitation or waiting message can replace them", () => {
    expect(
      withoutQuestions("What would you change? How would you measure it?"),
    ).toBe("");
    expect(withoutQuestions("What next？")).toBe("");
  });
  it("leaves a statement-only reply or empty reply safe to display", () => {
    expect(withoutQuestions("  Go ahead with your sketch.  ")).toBe(
      "Go ahead with your sketch.",
    );
    expect(withoutQuestions("")).toBe("");
  });
  it("removes walkthrough demands and unpunctuated questions while the candidate has the floor", () => {
    expect(
      withoutQuestions(
        "Take your time. Please walk me through your request path. Tell me why you chose that server.",
      ),
    ).toBe("Take your time.");
    expect(withoutQuestions("How will you scale it")).toBe("");
  });
  it("preserves URL query strings in factual answers and removes quoted questions", () => {
    expect(
      withoutQuestions(
        'Keep query strings such as https://example.com/?id=1. "What would you change?"',
      ),
    ).toBe("Keep query strings such as https://example.com/?id=1.");
  });
});
