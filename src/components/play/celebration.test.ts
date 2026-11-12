import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { BADGE_LABELS } from "@/lib/play/public";
import { BADGE_REWARDS } from "./badge-rewards";
import { Celebration } from "./celebration";
it("presents each earned badge as a named reward with its meaning and no dismiss action", () => {
  expect(new Set(BADGE_REWARDS.map((b) => b.id))).toEqual(
    new Set(Object.keys(BADGE_LABELS)),
  );
  for (const badge of BADGE_REWARDS) {
    const html = renderToStaticMarkup(
      createElement(Celebration, { title: "Badge earned", badges: [badge.id] }),
    );
    expect(html).toContain(BADGE_LABELS[badge.id]);
    expect(html).toContain(badge.meaning.replaceAll("'", "&#x27;"));
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/<button|Dismiss/u);
  }
  expect(
    renderToStaticMarkup(
      createElement(Celebration, {
        title: "Badge earned",
        badges: ["unknown-private-id"],
      }),
    ),
  ).toBe("");
});
