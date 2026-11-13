import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { courseProgress } from "./progress";
import { WorldBanner } from "@/components/play/world-banner";
it("counts Topic 0 stars and ten topics without borrowing retired rewards", () => {
  const row = (level: number, topic = "rag-course") => ({
    level,
    topic,
    status: "passed" as const,
    best_score: 1,
    best_stars: 3,
  });
  const legacy = courseProgress([row(1), row(2), row(1, "rag"), row(99)]);
  expect(legacy).toEqual({ stars: 6, levelsPassed: 2, totalLevels: 10 });
  const primer = courseProgress([row(0), row(1), row(2)]);
  expect(primer).toEqual({ stars: 9, levelsPassed: 3, totalLevels: 10 });
  const html = renderToStaticMarkup(
    createElement(WorldBanner, { title: "RAG", unit: "topics", ...primer }),
  );
  expect(html).toContain('aria-label="9 / 30 stars"');
  expect(html).toContain('aria-label="3 of 10 topics passed"');
  expect(
    courseProgress(Array.from({ length: 10 }, (_, level) => row(level))),
  ).toEqual({ stars: 30, levelsPassed: 10, totalLevels: 10 });
  expect(courseProgress([])).toEqual({
    stars: 0,
    levelsPassed: 0,
    totalLevels: 10,
  });
});
