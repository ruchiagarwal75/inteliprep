import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ModeNav } from "./mode-nav";
import { GameHud } from "./game-hud";
it("shows ten whole XP segments and the daily outcome from server totals", () => {
  const html = renderToStaticMarkup(
    createElement(GameHud, {
      totals: {
        points: 121,
        streak: 1,
        dailyGoal: true,
        xpLevel: { level: 2, currentXp: 21, neededXp: 200, nextXp: 300 },
      },
    }),
  );
  expect(html.match(/data-pixel-block/gu)).toHaveLength(10);
  expect(html.match(/data-state="done"/gu)).toHaveLength(1);
  expect(html).toContain('aria-valuenow="21"');
  expect(html).toContain('aria-valuemax="200"');
  expect(html).toContain("data-complete");
});
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
