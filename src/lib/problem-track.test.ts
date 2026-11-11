import { expect, it } from "vitest";
import { briefDefaults } from "./brief-preferences";
import { listProblems } from "./problems";
import {
  nextProblemInTrack,
  parseProblemTrack,
  problemTrack,
  problemsInTrack,
} from "./problem-track";
import { savedFixture } from "./fixtures/saved-interview-test";
import { savedInterviewSummary } from "./saved-interview";
it("defaults to core, validates stored choices, and filters both tracks", () => {
  const problems = listProblems();
  expect(parseProblemTrack("unknown")).toBeUndefined();
  expect(briefDefaults(problems).problemId).toBe("single-server-scaling");
  expect(problemsInTrack(problems, "core")).toHaveLength(8);
  expect(
    problemsInTrack(problems, "genai").every((p) => p.track === "genai"),
  ).toBe(true);
  expect(
    problemTrack(
      problems.find(
        (p) =>
          p.problemId ===
          briefDefaults(
            problems,
            undefined,
            undefined,
            undefined,
            undefined,
            "genai",
          ).problemId,
      ),
    ),
  ).toBe("genai");
});
it("keeps suggestions and retries in the selected problem's track", () => {
  const problems = listProblems();
  expect(nextProblemInTrack(problems, "video-streaming")?.problemId).toBe(
    "single-server-scaling",
  );
  expect(nextProblemInTrack(problems, "tool-using-ai-agent")?.track).toBe(
    "genai",
  );
  const latest = {
    ...savedFixture(),
    hasEnded: true,
    interview: { ...savedFixture().interview, problemId: "video-streaming" },
  };
  expect(
    briefDefaults(problems, latest, savedInterviewSummary(latest)).problemId,
  ).toBe("single-server-scaling");
  expect(
    briefDefaults(
      problems,
      latest,
      savedInterviewSummary(latest),
      "staff",
      "enterprise-rag-assistant",
      "core",
    ),
  ).toMatchObject({ problemId: "enterprise-rag-assistant", level: "staff" });
  expect(nextProblemInTrack([], "missing")).toBeUndefined();
});
