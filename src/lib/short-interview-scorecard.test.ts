import { expect, it } from "vitest";
import { getProblem } from "@/lib/problems";
import { shortInterviewScorecard } from "@/lib/short-interview-scorecard";
it("builds a neutral non-model result and preserves the empty-answer explanation", () => {
  const problem = getProblem("url-shortener");
  if (!problem) throw Error("Missing problem");
  for (const hasAnswer of [true, false]) {
    const card = shortInterviewScorecard(
      problem,
      "mid",
      new Date().toISOString(),
      "too_short",
      hasAnswer,
    );
    expect(card.notScoredReason).toBe("too_short");
    expect(card.areas).toHaveLength(5);
    expect(
      card.areas.every(
        (area) => area.score === null && area.evidence.length === 0,
      ),
    ).toBe(true);
    expect(card.strengths).toEqual([]);
    expect(card.gaps).toEqual([]);
    if (!hasAnswer)
      expect(card.summary).toContain("ended before giving a technical answer");
  }
});
