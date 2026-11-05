import { describe, expect, it } from "vitest";
import {
  configuredClarification,
  sharedRequirementCriteria,
} from "@/lib/configured-clarifications";
import { getProblem } from "@/lib/problems";
import { interviewLevelSchema } from "@/lib/interview-selection";

describe("reported catalog conversations", () => {
  it.each(interviewLevelSchema.options)(
    "gives rate limiter rejection policy once at %s",
    (level) => {
      const problem = getProblem("rate-limiter");
      if (!problem) throw new Error("Missing problem");
      const reply = configuredClarification(
        problem,
        level,
        "What's the limit policy (e.g. 100 requests per minute per key), what happens above the limit, and do rejected requests consume quota?",
      );
      expect(
        reply?.text.match(/rejected requests do not consume quota/giu),
      ).toHaveLength(1);
      expect(reply?.text).toContain("HTTP 429");
    },
  );
  it.each(interviewLevelSchema.options)(
    "supplies feed guarantees up front at %s",
    (level) => {
      const problem = getProblem("news-feed");
      if (!problem) throw new Error("Missing problem");
      const opening = problem.levels[level].openingMessage;
      expect(opening).toContain("90-day retention");
      expect(opening).toContain("60 seconds as defaults");
      expect(opening.split(/\s+/u).length).toBeLessThan(200);
      const criteria = sharedRequirementCriteria(problem, level, [
        { role: "assistant", content: opening },
        {
          role: "user",
          content: "How much traffic and what response time should I use?",
        },
      ]);
      expect(criteria.sort()).toEqual([0, 1, 2]);
    },
  );
  it.each([
    "Let's keep posts for one year and remove deleted posts within a few seconds. Is that OK?",
    "I propose one year retention. Can we remove deletes within a few seconds?",
    "Can we retain posts for one year and remove deletes within a few seconds?",
  ])("does not overwrite working assumptions: %s", (content) => {
    const problem = getProblem("news-feed");
    if (!problem) throw new Error("Missing problem");
    expect(configuredClarification(problem, "mid", content)).toBeUndefined();
  });
  it("recognizes feed goals already delivered with the previous Yes wording", () => {
    const problem = getProblem("news-feed");
    if (!problem) throw new Error("Missing problem");
    const previousReply = problem.clarifications[0].answers.mid.replace(
      "New posts",
      "Yes, new posts",
    );
    expect(
      sharedRequirementCriteria(problem, "mid", [
        { role: "assistant", content: previousReply },
        {
          role: "user",
          content: "I answered the publishing and retention question already.",
        },
      ]).sort(),
    ).toEqual([0, 1, 2]);
  });
});
