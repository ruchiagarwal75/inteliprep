import { expect, it } from "vitest";
import { cacheableInterviewerRequest } from "@/lib/interviewer-cache";
it("marks an identical stable developer prefix and leaves variable state after its breakpoint", () => {
  const base = {
    model: "gpt-6.1-terra",
    instructions: "Stable private configuration",
    reasoning: { effort: "low" as const },
  };
  const first = cacheableInterviewerRequest({ ...base, input: "First answer" });
  const next = cacheableInterviewerRequest({ ...base, input: "Second answer" });
  if (!Array.isArray(first.input) || !Array.isArray(next.input))
    throw Error("Expected input messages");
  expect(first.input[0]).toEqual(next.input[0]);
  expect(first.input[0]).toMatchObject({
    role: "developer",
    content: [
      {
        text: base.instructions,
        prompt_cache_breakpoint: { mode: "explicit", ttl: "30m" },
      },
    ],
  });
  expect(first.input[1]).toEqual({ role: "user", content: "First answer" });
  expect(first.prompt_cache_options).toEqual({ mode: "explicit", ttl: "30m" });
  expect(first.instructions).not.toContain("First answer");
});
it("preserves legacy providers and rechecks the entire transformed request budget", () => {
  const legacy = {
    model: "gpt-4o",
    instructions: "Existing prompt",
    input: "answer",
  };
  expect(cacheableInterviewerRequest(legacy)).toBe(legacy);
  expect(() =>
    cacheableInterviewerRequest({
      model: "gpt-6.1-sol",
      instructions: "x".repeat(128000),
      input: "answer",
    }),
  ).toThrow("context limit");
});
