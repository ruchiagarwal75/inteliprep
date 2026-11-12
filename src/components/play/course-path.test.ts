import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CoursePath } from "./course-path";
vi.mock("@/components/candidate-account-context", () => ({
  useCandidateAccount: () => ({ request: vi.fn() }),
}));

it("offers slides in started topic popovers, without opening unstarted topics", () => {
  const html = renderToStaticMarkup(
    createElement(CoursePath, {
      passed: [1],
      started: [1, 2],
      stars: {},
      chests: {},
    }),
  );
  expect(html).toMatch(/data-topic-review="1"[^]*?Review slides/);
  expect(html).toMatch(/data-topic-review="2"[^]*?Review slides/);
  expect(html).not.toContain('data-topic-review="3"');
  expect(html).toContain('href="/play/rag/topics/1">Review slides</a>');
  expect(html).toContain('href="/play/rag/topics/2">Review slides</a>');
});
