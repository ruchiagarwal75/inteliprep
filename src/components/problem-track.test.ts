import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProblemTrackBadge } from "./problem-track-badge";
import { ProblemTrackToggle } from "./problem-track-toggle";
it("shows the AI badge only for the AI / ML track", () => {
  expect(
    renderToStaticMarkup(createElement(ProblemTrackBadge, { track: "core" })),
  ).toBe("");
  expect(
    renderToStaticMarkup(createElement(ProblemTrackBadge, { track: "genai" })),
  ).toContain('aria-label="AI / ML system design"');
  expect(renderToStaticMarkup(createElement(ProblemTrackBadge, {}))).toBe("");
});
it("renders a labeled native radio group with the selected explanation", () => {
  const html = renderToStaticMarkup(
    createElement(ProblemTrackToggle, {
      value: "genai",
      disabled: false,
      onChange: () => {},
    }),
  );
  expect(html).toContain('role="radiogroup"');
  expect(html.match(/type="radio"/gu)).toHaveLength(2);
  expect(html).toContain(
    "Design AI products and ML systems: RAG, assistants, agents, recommendations and ads ranking.",
  );
  expect(html).toMatch(
    /<input(?=[^>]*value="genai")(?=[^>]*checked="")[^>]*>/u,
  );
});
