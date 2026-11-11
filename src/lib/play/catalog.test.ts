import { expect, it } from "vitest";
import { PLAY_TOPICS, RAG_LEVELS, playTopic } from "./catalog";
it("opens only RAG and keeps future topics in config", () => {
  expect(
    PLAY_TOPICS.filter((topic) => topic.available).map((topic) => topic.id),
  ).toEqual(["rag"]);
  expect(
    PLAY_TOPICS.filter((topic) => !topic.available).map((topic) => topic.title),
  ).toEqual(["Chat and serving", "Agents", "Final Loop"]);
  expect(playTopic("rag")?.available).toBe(true);
  expect(playTopic("unknown")).toBeUndefined();
  expect(RAG_LEVELS.map((level) => level.title)).toEqual([
    "Retrieval basics",
    "Scale math",
    "Permissions and freshness",
    "Quality and safety",
  ]);
});
