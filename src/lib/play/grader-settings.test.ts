import { expect, it, vi, afterEach } from "vitest";
import { drillModelSettings } from "./grader-settings";
import { modelSettings } from "@/lib/model-settings";
afterEach(() => vi.unstubAllEnvs());
it("keeps the short-drill grader independent of Mock model and reasoning overrides", () => {
  vi.stubEnv("OPENAI_MODEL", "gpt-6.1-terra");
  vi.stubEnv("OPENAI_INTERVIEW_REASONING_EFFORT", "low");
  vi.stubEnv("OPENAI_SCORECARD_MODEL", "gpt-6.1-sol");
  expect(drillModelSettings).toEqual({
    model: "gpt-6-luna",
    reasoning: { effort: "none" },
    max_output_tokens: 768,
  });
  expect(modelSettings("reply")).toMatchObject({
    model: "gpt-6.1-terra",
    reasoning: { effort: "low" },
  });
  expect(modelSettings("feedback").model).toBe("gpt-6.1-sol");
});
