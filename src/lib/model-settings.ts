import "server-only";
import { z } from "zod";
import { interviewerModel } from "@/lib/openai-client";

type ModelOperation = "reply" | "assessment" | "question_review" | "feedback";
const effortSchema = z.enum(["none", "low", "medium", "high", "xhigh", "max"]);
const legacyBudgets = {
  reply: 800,
  assessment: 1_200,
  question_review: 900,
  feedback: 5_000,
};

/** Separate interactive and grading settings; keep explicit legacy model overrides working. */
export function modelSettings(operation: ModelOperation) {
  const grading = operation === "feedback";
  const model = grading
    ? process.env.OPENAI_SCORECARD_MODEL?.trim() || interviewerModel()
    : interviewerModel();
  if (!/^gpt-6\.1-(?:sol|terra)(?:-|$)/u.test(model))
    return {
      model,
      max_output_tokens: legacyBudgets[operation],
      ...(grading || operation === "question_review" ? { temperature: 0 } : {}),
    };
  const setting = grading
    ? "OPENAI_SCORECARD_REASONING_EFFORT"
    : "OPENAI_INTERVIEW_REASONING_EFFORT";
  const effort = effortSchema.safeParse(process.env[setting]?.trim() || "low");
  if (
    !effort.success ||
    (effort.data === "none" && !/^gpt-6\.1-terra(?:-|$)/u.test(model))
  )
    throw new Error(`${setting} has an unsupported value`);
  return {
    model,
    // Interactive grading caps old high-effort settings to keep feedback responsive.
    reasoning: {
      effort:
        grading && effort.data !== "none" ? ("low" as const) : effort.data,
    },
    // Reasoning and visible output share this budget. Existing text/input caps still apply.
    max_output_tokens: grading ? 16_000 : 4_096,
  };
}
