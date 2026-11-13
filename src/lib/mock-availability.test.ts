import { expect, it } from "vitest";
import { isMockAvailable } from "./mock-access-public";
import { problemBriefs } from "./problems";

it("opens only the RAG question for the beta launch without changing the catalog", () => {
  const all = problemBriefs();
  expect(all).toHaveLength(13);
  expect(
    all
      .filter((problem) => isMockAvailable(problem.problemId))
      .map((problem) => problem.problemId),
  ).toEqual(["enterprise-rag-assistant"]);
  expect(isMockAvailable("unknown")).toBe(false);
});
