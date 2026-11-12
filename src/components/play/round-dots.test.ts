import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RoundDots } from "./round-dots";
it("shows graded outcomes, the current drill and unanswered drills", () => {
  const html = renderToStaticMarkup(
    createElement(RoundDots, {
      total: 5,
      current: 2,
      outcomes: [true, false, null, null, null],
    }),
  );
  expect(html.match(/<li /g)).toHaveLength(5);
  expect(html).toContain('aria-label="Drill 1: Correct"');
  expect(html).toContain('aria-label="Drill 2: Not quite"');
  expect(html).toContain('aria-label="Drill 3: Current drill"');
  expect(html).toContain('aria-label="Drill 5: Not answered"');
});
