import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { LevelUp } from "./level-up";
vi.mock("next/navigation", () => ({ usePathname: () => "/play/rag" }));
it("uses the server next-level threshold instead of hardcoding the curve", () => {
  const html = renderToStaticMarkup(
    createElement(LevelUp, {
      progress: { level: 2, currentXp: 21, neededXp: 200, nextXp: 1234 },
      onClose: () => {},
    }),
  );
  expect(html).toContain('aria-label="You&#x27;re now Lv 2"');
  expect(html.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ")).toContain(
    "Next: Lv 3 at 1,234 XP",
  );
  expect(html).toContain("data-confetti");
});
