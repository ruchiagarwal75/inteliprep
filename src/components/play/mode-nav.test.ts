import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ModeNav } from "./mode-nav";
it("shows the current mode and server-supplied rewards", () => {
  const html = renderToStaticMarkup(
    createElement(ModeNav, { active: "play", points: 35, streak: 2 }),
  );
  expect(html).toMatch(
    /<a(?=[^>]*href="\/play")(?=[^>]*aria-current="page")[^>]*>/u,
  );
  expect(html).toContain('href="/mock"');
  expect(html).toContain('href="/progress"');
  expect(html).toContain("35 XP");
  expect(html).toContain("2-day streak");
  const unavailable = renderToStaticMarkup(
    createElement(ModeNav, { active: "mock" }),
  );
  expect(unavailable).toContain("XP unavailable");
  expect(unavailable).not.toContain("0 XP");
});
