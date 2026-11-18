import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { THEME_COOKIE } from "../../src/lib/theme-preference";
import { WELCOME_PANELS } from "../../src/lib/play/welcome-copy";
import {
  HOME_INTRO_COOKIE,
  HOME_INTRO_SEEN,
} from "../../src/lib/play/home-intro-preference";

// Exercise the human visitor path. Known automation deliberately keeps the landing page.
test.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "webdriver", { get: () => false }),
  );
});
async function stats(page: import("@playwright/test").Page) {
  const r = await page.request.get("https://127.0.0.1:4444/fixture/stats");
  expect(r.status()).toBe(200);
  return r.json();
}
for (const theme of ["light", "dark"])
  for (const width of [1440, 375])
    test(`home intro opens before an account or browser check: ${theme}, ${width}`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: THEME_COOKIE, value: theme, url: "http://localhost:3100" },
      ]);
      await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const before = await stats(page);
      const accountRequests: string[] = [];
      page.on("request", (r) => {
        if (/\/api\/play\/guest(?:\?|$)|\/auth\/v1\/signup/u.test(r.url()))
          accountRequests.push(r.url());
      });
      await page.goto("/");
      await expect(page).toHaveURL("http://localhost:3100/");
      const intro = page.getByRole("dialog");
      await expect(intro).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      mkdirSync("artifacts/home-welcome", { recursive: true });
      for (const [panelIndex, panel] of WELCOME_PANELS.entries()) {
        await expect(
          intro.getByRole("heading", { name: panel.title, exact: true }),
        ).toBeVisible();
        const fits = await intro.evaluate((node) => {
          const r = node.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.right <= innerWidth &&
            r.top >= 0 &&
            r.bottom <= innerHeight &&
            node.scrollHeight <= node.clientHeight
          );
        });
        expect(fits).toBe(true);
        await intro.screenshot({
          path: `artifacts/home-welcome/panel-${panelIndex + 1}-${theme}-${width}.png`,
          animations: "disabled",
        });
        for (let beat = 0; beat < panel.beats.length; beat++) {
          await expect(intro.locator('[aria-live="polite"]')).toHaveText(
            panel.beats[beat].line,
          );
          if (
            panelIndex < WELCOME_PANELS.length - 1 ||
            beat < panel.beats.length - 1
          )
            await intro
              .getByRole("button", { name: "Next", exact: true })
              .click();
        }
      }
      expect(accountRequests).toEqual([]);
      await intro
        .getByRole("button", { name: "Go to Play", exact: true })
        .click();
      await expect(page).toHaveURL(/\/play$/);
      await expect(
        page.getByRole("heading", {
          name: "Try your first topics",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(accountRequests).toEqual([]);
      expect(
        (await context.cookies()).find((c) => c.name === HOME_INTRO_COOKIE)
          ?.value,
      ).toBe(HOME_INTRO_SEEN);
      const after = await stats(page);
      expect(after.anonymousSignups).toBe(before.anonymousSignups);
      expect(after.modelCalls).toBe(before.modelCalls);
      await page.goto("/");
      await expect(page.locator("[data-home-start]")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

test("Skip stays on home, restores focus and stays dismissed when guest practice starts", async ({
  page,
  context,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL("http://localhost:3100/");
  await expect(page.locator("[data-home-start]")).toBeFocused();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await signIn(context, "guestHomeIntro");
  await page.goto("/play");
  await expect(
    page.getByRole("heading", { name: /Level up for the AI engineer role/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/play/welcome");
  await expect(page).toHaveURL(/\/play$/);
  const second = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    await signIn(second, "guestHomeIntro");
    const other = await second.newPage();
    await other.goto("http://localhost:3100/play");
    await expect(
      other.getByRole("heading", { name: /Level up for the AI engineer role/ }),
    ).toBeVisible();
    await expect(other.getByRole("dialog")).toHaveCount(0);
  } finally {
    await second.close();
  }
});
