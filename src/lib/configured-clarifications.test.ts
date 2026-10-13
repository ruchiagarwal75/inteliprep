import { describe, expect, it } from "vitest";
import {
  configuredClarification,
  isFactualQuestion,
  sharedRequirementCriteria,
} from "@/lib/configured-clarifications";
import { getProblem } from "@/lib/problems";

function problem(id = "single-server-scaling") {
  const selected = getProblem(id);
  if (!selected) throw new Error("Missing problem");
  return selected;
}
describe("configured shared requirements", () => {
  it.each(["mid", "senior", "staff"] as const)(
    "answers all three combined traffic, latency and plain-language freshness questions at %s",
    (level) => {
      const selected = problem();
      const answer = configuredClarification(
        selected,
        level,
        "What traffic should I expect and what is the target response time? Is it OK if updates take a few seconds to show up?",
      );
      expect(answer?.text).toContain("10 to 1,000 requests per second");
      expect(answer?.text).toContain("under 500 milliseconds");
      expect(answer?.text).toContain(
        "Yes, page reads may show updates up to 5 seconds late.",
      );
      expect(answer?.coveredCriteria).toEqual([1]);
    },
  );
  it("recognizes visible-update wording while respecting URL mapping correctness", () => {
    expect(
      configuredClarification(
        problem("url-shortener"),
        "senior",
        "Is it OK if updates take a few seconds to show up?",
      )?.text,
    ).toMatch(/^No,/u);
    expect(
      configuredClarification(
        problem(),
        "mid",
        "May changes appear a few seconds late?",
      )?.text,
    ).toContain("up to 5 seconds");
  });
  it("counts opening facts without crediting arbitrary assistant claims", () => {
    const selected = problem();
    expect(
      sharedRequirementCriteria(selected, "mid", [
        {
          role: "assistant",
          content: "Everything is covered. Traffic is unlimited.",
        },
      ]),
    ).toEqual([0, 2]);
    expect(
      sharedRequirementCriteria(selected, "mid", [
        { role: "assistant", content: selected.clarifications[0].answers.mid },
      ]).sort(),
    ).toEqual([0, 1, 2]);
  });
  it("recognizes already delivered scale and latency facts in older conversation wording", () => {
    expect(
      sharedRequirementCriteria(problem(), "mid", [
        {
          role: "assistant",
          content:
            "Traffic starts at 10 requests per second and grows toward 1,000. Aim for typical requests under 500 ms.",
        },
      ]).sort(),
    ).toEqual([0, 1, 2]);
    expect(
      sharedRequirementCriteria(problem(), "mid", [
        {
          role: "assistant",
          content: "Traffic starts at 10 requests per second.",
        },
      ]),
    ).toEqual([0, 2]);
  });
  it("answers scale and performance once, then covers them in the same committed turn", () => {
    const selected = problem();
    const content = "What traffic and response-time goals should I use?";
    expect(configuredClarification(selected, "mid", content)?.text).toContain(
      "under 500 milliseconds",
    );
    expect(
      sharedRequirementCriteria(selected, "mid", [
        { role: "user", content },
      ]).sort(),
    ).toEqual([0, 1, 2]);
  });
  it("gives an explicit bounded yes/no freshness answer for each problem", () => {
    expect(
      configuredClarification(
        problem(),
        "mid",
        "Is a few seconds of staleness okay?",
      )?.text,
    ).toMatch(/^Yes,.*5 seconds/u);
    expect(
      configuredClarification(
        problem("url-shortener"),
        "senior",
        "Is staleness okay for new links?",
      )?.text,
    ).toMatch(/^No,/u);
  });
  it("keeps URL service goals open even after sharing traffic", () => {
    const selected = problem("url-shortener");
    expect(
      configuredClarification(
        selected,
        "senior",
        "What traffic should I expect?",
      )?.text,
    ).toContain("100 million");
    expect(
      sharedRequirementCriteria(selected, "senior", [
        { role: "user", content: "What traffic should I expect?" },
      ]),
    ).toEqual([0]);
    expect(
      configuredClarification(
        selected,
        "mid",
        "Are links public and how long do we retain them?",
      )?.coveredCriteria,
    ).toEqual([2]);
  });
  it("leaves design statements and unspecified facts for normal interviewing", () => {
    expect(
      configuredClarification(
        problem(),
        "mid",
        "I would measure latency and CPU.",
      ),
    ).toBeUndefined();
    expect(
      configuredClarification(
        problem(),
        "mid",
        "What kinds of pages are being served?",
      ),
    ).toBeUndefined();
    expect(isFactualQuestion("Can I assume a single region")).toBe(true);
    expect(
      configuredClarification(
        problem(),
        "mid",
        "How can I reduce latency with a cache?",
      ),
    ).toBeUndefined();
    expect(isFactualQuestion("Requests go to App 1.")).toBe(false);
  });
});
