import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { modelSettings } from "@/lib/model-settings";

beforeEach(() => {
  for (const key of [
    "OPENAI_MODEL",
    "OPENAI_SCORECARD_MODEL",
    "OPENAI_INTERVIEW_REASONING_EFFORT",
    "OPENAI_SCORECARD_REASONING_EFFORT",
  ])
    vi.stubEnv(key, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("workload model settings", () => {
  it("supports Terra low or none while preserving the separately configured Sol grader", () => {
    vi.stubEnv("OPENAI_MODEL", "gpt-6.1-terra");
    vi.stubEnv("OPENAI_SCORECARD_MODEL", "gpt-6.1-sol");
    expect(modelSettings("reply")).toMatchObject({
      model: "gpt-6.1-terra",
      reasoning: { effort: "low" },
    });
    expect(modelSettings("feedback")).toMatchObject({
      model: "gpt-6.1-sol",
      reasoning: { effort: "low" },
    });
    vi.stubEnv("OPENAI_INTERVIEW_REASONING_EFFORT", "none");
    expect(modelSettings("reply").reasoning?.effort).toBe("none");
    expect(modelSettings("question_review")).not.toHaveProperty("temperature");
  });
  it.each(["reply", "assessment", "question_review"] as const)(
    "uses low reasoning and a bounded reasoning budget for %s",
    (operation) => {
      expect(modelSettings(operation)).toEqual({
        model: "gpt-6.1-sol",
        reasoning: { effort: "low" },
        max_output_tokens: 4_096,
      });
    },
  );
  it("uses low reasoning and a larger output budget for grading, without temperature", () => {
    expect(modelSettings("feedback")).toEqual({
      model: "gpt-6.1-sol",
      reasoning: { effort: "low" },
      max_output_tokens: 16_000,
    });
  });
  it("configures reasoning independently for interview and scorecard", () => {
    vi.stubEnv("OPENAI_INTERVIEW_REASONING_EFFORT", " medium ");
    vi.stubEnv("OPENAI_SCORECARD_REASONING_EFFORT", " xhigh ");
    expect(modelSettings("reply").reasoning?.effort).toBe("medium");
    expect(modelSettings("feedback").reasoning?.effort).toBe("low");
  });
  it("rejects unsupported effort without forwarding the value to the provider", () => {
    vi.stubEnv("OPENAI_INTERVIEW_REASONING_EFFORT", "none");
    expect(() => modelSettings("reply")).toThrow(
      "OPENAI_INTERVIEW_REASONING_EFFORT has an unsupported value",
    );
  });
  it("keeps existing model overrides and allows a separate grader", () => {
    vi.stubEnv("OPENAI_MODEL", " gpt-4o ");
    expect(modelSettings("reply")).toEqual({
      model: "gpt-4o",
      max_output_tokens: 800,
    });
    expect(modelSettings("feedback")).toEqual({
      model: "gpt-4o",
      max_output_tokens: 5_000,
      temperature: 0,
    });
    vi.stubEnv("OPENAI_SCORECARD_MODEL", "gpt-6.1-sol");
    expect(modelSettings("feedback").reasoning?.effort).toBe("low");
    expect(modelSettings("reply")).not.toHaveProperty("reasoning");
  });
});
