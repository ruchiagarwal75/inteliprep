import { describe, expect, it } from "vitest";
import {
  createInterviewStart,
  getProblem,
  listProblems,
  problemBriefs,
} from "./problems";
import { buildInterviewInstructions } from "./interview-instructions";
import { genaiFact } from "./genai-facts";
import { publicPhase } from "./phase-config";
const names = [
  "Clarify and frame the problem",
  "Draw and explain",
  "Data, features and model",
  "Serving, scale and monitoring",
  "Tradeoffs and wrap-up",
];
const areas = [
  "Problem framing and metrics",
  "Data and labels",
  "Features and model",
  "Serving and scale",
  "Evaluation (offline and online)",
  "Monitoring and feedback loops",
  "Safety, fairness and privacy",
];
const examples = [
  {
    id: "video-recommendations",
    anchors: 4,
    flags: 7,
    senior: {
      "mmq7-dau": "100M daily active users.",
      "mmq7-catalog": "50M videos, with 500K new videos per day.",
      "mmq7-feed-requests":
        "5 feed requests per user per day, with peak traffic three times the average.",
      "mmq7-feed-size": "20 videos per feed.",
      "mmq7-latency": "The full feed should arrive within 200 ms at p99.",
      "mmq7-signals":
        "Clicks, watch time, likes, shares, skips and not interested.",
      "mmq7-goal":
        "The goal is long-term satisfaction, not just clicks; clickbait is a known problem.",
      "mmq7-freshness": "New videos must become recommendable within one hour.",
      "mmq7-new-users": "10% of daily users are new.",
      "mmq7-today":
        "Today there is a collaborative filtering model retrained weekly.",
      "mmq7-embedding-dimensions": "Embeddings have 256 dimensions.",
    },
  },
  {
    id: "ad-click-prediction",
    anchors: 3,
    flags: 6,
    senior: {
      "mmq7-dau": "300M daily active users.",
      "mmq7-ad-requests":
        "10 ad requests per user per day, with peak traffic three times the average.",
      "mmq7-candidates": "500 candidate ads per request after targeting.",
      "mmq7-latency":
        "Scoring all candidates should take at most 50 ms at p99.",
      "mmq7-click-rate": "The click rate is about 1%.",
      "mmq7-pricing":
        "Pricing is cost per click. Ads are ranked by predicted click rate multiplied by bid in an auction.",
      "mmq7-advertisers": "1M advertisers, 10M ads and 100K new ads a day.",
      "mmq7-feedback-delay":
        "Most clicks arrive within one hour; conversions can arrive up to seven days later.",
      "mmq7-privacy":
        "No sensitive categories. User opt-outs must apply within 24 hours.",
      "mmq7-today": "Today logistic regression is retrained daily.",
      "mmq7-ads-shown": "About five ads are shown per request.",
    },
  },
];
describe.each(examples)("ML catalog: $id", (example) => {
  const problem = getProblem(example.id);
  if (!problem?.genai) throw Error("Missing ML config");
  const config = problem.genai;
  it("uses the supplied seven areas, five phase titles and private reference content", () => {
    expect(problem.track).toBe("genai");
    expect(problem.rubric.map((r) => r.area)).toEqual(areas);
    expect(problem.phases.map((p) => p.title)).toEqual(names);
    expect(config.estimateAnchors.senior).toHaveLength(example.anchors);
    expect(config.estimateAnchors.mid.length).toBeGreaterThan(0);
    expect(config.estimateAnchors.staff.length).toBeGreaterThan(0);
    expect(config.redFlags).toHaveLength(example.flags);
    expect(config.expectedDesign.length).toBeGreaterThan(0);
    expect(
      Object.fromEntries(config.facts.map((f) => [f.id, f.answers.senior])),
    ).toEqual(example.senior);
    for (const probe of problem.reviewProbes) {
      expect(() => new RegExp(probe.topicPattern, "iu")).not.toThrow();
      expect(probe.areaIndex).toBeLessThan(areas.length);
      expect(probe.stageIndex).toBeGreaterThanOrEqual(2);
      expect(probe.question).not.toMatch(/52M|8\.7M|5,800|104K/u);
    }
  });
  for (const level of ["mid", "senior", "staff"] as const) {
    it(`discloses only requested facts and keeps private material out of the ${level} prompt and catalog`, () => {
      const catalog = JSON.stringify([listProblems(), problemBriefs()]);
      for (const fact of config.facts) {
        expect(fact.answers[level].length).toBeGreaterThan(0);
        expect(genaiFact(problem, level, [fact.id])?.text).toBe(
          fact.answers[level],
        );
      }
      const first = config.facts.slice(0, 2);
      expect(
        genaiFact(
          problem,
          level,
          first.map((f) => f.id),
        )?.text,
      ).toBe(first.map((f) => f.answers[level]).join("\n\n"));
      for (const phase of problem.phases) {
        const instructions = buildInterviewInstructions({
          problem,
          level,
          phase,
        });
        expect(instructions).not.toContain("GenAI application design");
        for (const secret of [
          ...config.facts.map((f) => f.answers[level]),
          ...config.estimateAnchors[level],
          ...config.expectedDesign,
          ...config.redFlags,
          ...problem.rubric.map((r) => r.strong),
        ]) {
          expect(catalog).not.toContain(secret);
          expect(instructions).not.toContain(secret);
        }
      }
      const start = createInterviewStart(problem, level);
      expect(start.stageNames).toEqual(names);
      expect(start.track).toBe("genai");
      expect(start.phase.title).toBe(names[0]);
      expect(
        listProblems().find((p) => p.problemId === problem.id)?.stageNames,
      ).toEqual(names);
      expect(
        problem.phases.map(
          (_, i) => publicPhase(problem.phases, i, problem.track).title,
        ),
      ).toEqual(names);
      expect(JSON.stringify(start)).not.toMatch(
        /estimateAnchors|expectedDesign|redFlags|rubric/u,
      );
      expect(problem.levels[level].openingMessage).not.toContain("\u2014");
    });
  }
});
