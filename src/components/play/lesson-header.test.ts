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
