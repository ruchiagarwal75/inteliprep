import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { LessonHeader } from "./lesson-header";
for (const combo of [0, 1, 2, 5])
  it(`only shows a combo chip once it is worth celebrating: ${combo}`, () => {
    const html = renderToStaticMarkup(
      createElement(LessonHeader, {
        topic: "rag",
        completed: combo,
        total: 5,
        combo,
      }),
    );
    expect(html.includes(`aria-label="Combo: ${combo}"`)).toBe(combo >= 2);
    expect(html).toContain("Close round");
    expect(html).toContain("Round progress");
    expect(html).toContain("Switch to dark mode");
  });

it("shows verified outcomes in five distinct blocks and preserves six placement blocks", () => {
  for (const total of [5, 6]) {
    const html = renderToStaticMarkup(
      createElement(LessonHeader, {
        topic: "rag",
        completed: 2,
        total,
        combo: 0,
        outcomes: [true, false, ...Array<null>(total - 2).fill(null)],
      }),
    );
    expect(html.match(/data-pixel-block=/g)).toHaveLength(total);
    expect(html.match(/data-state="correct"/g)).toHaveLength(1);
    expect(html.match(/data-state="wrong"/g)).toHaveLength(1);
    expect(html.match(/data-state="empty"/g)).toHaveLength(total - 2);
    expect(html).toContain('aria-valuenow="2"');
  }
});
