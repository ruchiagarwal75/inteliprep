import { expect, it } from "vitest";
import { genaiComponents } from "./genai-components";
import { isGenaiEstimate } from "./genai-estimate-detection";
import { problemSchema } from "./problem-definition";
import { getProblem } from "./problems";
import { buildInterviewInstructions } from "./interview-instructions";
import { publicPhase } from "./phase-config";
it.each([
  "candidate generation",
  "ranking",
  "re-ranking",
  "two-tower",
  "embeddings",
  "ANN index",
  "feature store",
  "training pipeline",
  "label store",
  "experiment platform",
  "auction",
  "calibration",
  "CTR model",
])("recognizes %s without prescribing a vendor", (name) => {
  expect(genaiComponents.some((role) => role.pattern.test(name))).toBe(true);
});
it.each([
  "I estimate 17K feed requests per second.",
  "We need 104K ad requests per second.",
  "I estimate 15B impressions per day.",
  "We need 52M item scores per second.",
  "I estimate 52M predictions per second.",
  "We need about 51 GB of embedding storage.",
  "I estimate click volume at 150M a day.",
])("recognizes the capacity estimate: %s", (text) =>
  expect(isGenaiEstimate(text)).toBe(true),
);
it("allows per-problem rules, quality/safety area names, and phase titles", () => {
  const template = getProblem("enterprise-rag-assistant");
  if (!template?.genai) throw Error("Missing fixture problem");
  const problem = problemSchema.parse({
    ...template,
    genai: {
      ...template.genai,
      interviewerRules:
        "This is an ML system design interview. Accept justified choices.",
      evaluationArea: "Evaluation (offline and online)",
      safetyArea: "Safety, fairness and privacy",
    },
    rubric: template.rubric.map((area) => ({
      ...area,
      area:
        area.area === "Evaluation and quality"
          ? "Evaluation (offline and online)"
          : area.area === "Safety and security"
            ? "Safety, fairness and privacy"
            : area.area,
    })),
    phases: template.phases.map((phase, i) => ({
      ...phase,
      title: i === 2 ? "Data, features and model" : phase.title,
    })),
  });
  const instructions = buildInterviewInstructions({
    problem,
    level: "senior",
    phase: problem.phases[0],
  });
  expect(instructions).toContain("ML system design interview");
  expect(instructions).not.toContain("GenAI application design");
  expect(publicPhase(problem.phases, 2, problem.track).title).toBe(
    "Data, features and model",
  );
  expect(publicPhase(problem.phases, 2, "core").title).toBe("Core design");
});
