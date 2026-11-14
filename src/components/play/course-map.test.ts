import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CourseMap } from "./course-map";
vi.mock("@/components/candidate-account-context", () => ({
  useCandidateAccount: () => ({ request: vi.fn() }),
}));

it("shows the complete map while offering only an accessible next topic", () => {
  const html = renderToStaticMarkup(
    createElement(CourseMap, {
      passed: [],
      stars: {},
      chests: {},
      bossState: "locked",
    }),
  );
  expect(html.match(/data-map-topic=/gu)).toHaveLength(10);
  expect(html).toContain("data-map-boss");
  expect(html).toContain('href="#rag-boss"');
  expect(html).toContain('href="/play/rag/topics/0"');
  expect(html).not.toContain('href="/play/rag/topics/9"');
  expect(html).toContain("Topic 9: Failure modes and safety, locked");
});

it("selects the next topic using the same progress rules as the detailed path", () => {
  const html = renderToStaticMarkup(
    createElement(CourseMap, {
      passed: [0, 1],
      started: [1, 2],
      stars: { 1: 3 },
      chests: {},
      bossState: "locked",
    }),
  );
  expect(html).toContain(
    'id="course-map-topic-title">Embeddings and the vector store',
  );
  expect(html).toContain('href="/play/rag/topics/2"');
  expect(html).toContain("Review slides");
  expect(html).toContain(
    'data-map-topic="2" data-state="current" aria-current="step"',
  );
});

it("retains earned stars and opened chest rewards after all topics are cleared", () => {
  const html = renderToStaticMarkup(
    createElement(CourseMap, {
      passed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      stars: { 9: 3 },
      chests: { 9: 35 },
      bossState: "ready",
    }),
  );
  expect(html).toContain("3 of 3 stars");
  expect(html).toContain("Chest opened: +35 XP");
  expect(html).toContain("Practice again");
});
