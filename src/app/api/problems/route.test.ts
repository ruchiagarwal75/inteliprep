import { expect, it } from "vitest";
import { GET } from "@/app/api/problems/route";

it("serves the public problem catalog without hidden interviewer configuration", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(
    body.problems.map((problem: { problemId: string }) => problem.problemId),
  ).toEqual(["single-server-scaling", "url-shortener"]);
  expect(body.problems[0].levels).toEqual(["mid", "senior", "staff"]);
  for (const problem of body.problems)
    expect(Object.keys(problem).sort()).toEqual([
      "levels",
      "problemId",
      "summary",
      "title",
    ]);
});
