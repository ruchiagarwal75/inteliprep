import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ragReplayTopics, RAG_AREA_TOPICS } from "./rag-topic-replay";
import { getProblem } from "./problems";
import { ScorecardTopicReplay } from "@/components/scorecard-topic-replay";
it("maps all seven RAG rubric titles to the requested course topics without changing scoring", () => {
  const problem = getProblem("enterprise-rag-assistant");
  expect(problem?.rubric.map((area) => area.area).sort()).toEqual(
    Object.keys(RAG_AREA_TOPICS).sort(),
  );
  expect(
    ragReplayTopics("enterprise-rag-assistant", "Ingestion and retrieval", 2),
  ).toEqual([1, 2, 3, 4]);
  expect(
    ragReplayTopics("enterprise-rag-assistant", "Safety and security", 1),
  ).toEqual([9]);
});
it("omits links for Solid/Strong, unassessed, other problems and unknown historical areas", () => {
  for (const score of [null, 3, 4])
    expect(
      ragReplayTopics("enterprise-rag-assistant", "Safety and security", score),
    ).toEqual([]);
  expect(
    ragReplayTopics("url-shortener", "Requirements and estimation", 1),
  ).toEqual([]);
  expect(
    ragReplayTopics("enterprise-rag-assistant", "Historical title", 1),
  ).toEqual([]);
});
it("links straight to each Learn page, including Topic 0", () => {
  const html = renderToStaticMarkup(
    createElement(ScorecardTopicReplay, {
      problemId: "enterprise-rag-assistant",
      area: "Requirements and estimation",
      score: 2,
    }),
  );
  expect(html).toContain('href="/play/rag/topics/0"');
  expect(html).toContain("Replay Topic 0");
});
