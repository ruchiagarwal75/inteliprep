import { expect, it } from "vitest";
import { GET } from "@/app/api/problems/route";

it("serves the public problem catalog without hidden interviewer configuration", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(
    body.problems
      .filter((problem: { track: string }) => problem.track === "core")
      .map((problem: { problemId: string }) => problem.problemId),
  ).toEqual([
    "single-server-scaling",
    "url-shortener",
    "rate-limiter",
    "chat-service",
    "news-feed",
    "notification-system",
    "file-storage",
    "video-streaming",
  ]);
  expect(body.problems[0].levels).toEqual(["mid", "senior", "staff"]);
  for (const problem of body.problems)
    expect(Object.keys(problem).sort()).toEqual([
      "levels",
      "problemId",
      "summary",
      "title",
      "track",
    ]);
});
