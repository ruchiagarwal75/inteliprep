import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { chestResultSchema } from "../../src/lib/play/public";
import { signIn } from "./fixture-auth";
import {
  openPlayLevel,
  finishPlayRound,
  fillPlayAnswer,
  playView,
  dismissLevelUp,
} from "./play-helpers";
const folder = "artifacts/pixel-fixes-1";
async function theme(page: Page, value: "dark" | "light") {
  const current = await page.locator("html").getAttribute("data-theme");
  if (current !== value)
    await page
      .getByRole("button", { name: `Switch to ${value} mode`, exact: true })
      .click();
  await page.evaluate(async () => document.fonts.ready);
}
async function shot(page: Page, name: string, width = 1440, fullPage = false) {
  mkdirSync(folder, { recursive: true });
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(async () => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: `${folder}/${name}-${width}.png`, fullPage });
}
test("pixel fixes preserve active timing, refresh old rounds, show numeric math and celebrate chests before level up", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await signIn(context, "playPixelFixes");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/play/rag");
  for (const color of ["dark", "light"] as const) {
    await theme(page, color);
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      const distance = await page
        .locator('[aria-current="step"]')
        .evaluate((step) => {
          const svg = step.querySelector<SVGSVGElement>(
              '[aria-label="Practice guide"] svg[data-pixel-sprite]',
            ),
            node = step.querySelector("summary");
          if (!svg || !node) throw Error("Missing guide");
          const b = svg.getBBox(),
            matrix = svg.getScreenCTM();
          if (!matrix) throw Error("Missing sprite transform");
          const left = b.x * matrix.a + matrix.e,
            right = left + b.width * matrix.a,
            box = node.getBoundingClientRect();
          return {
            gap: Math.max(box.left - right, left - box.right, 0),
            width: b.width * matrix.a,
            height: b.height * matrix.d,
          };
        });
      expect(distance.gap).toBeLessThanOrEqual(24);
      expect(distance.width).toBeGreaterThanOrEqual(80);
      expect(distance.height).toBeGreaterThanOrEqual(100);
      await shot(page, `path-${color}`, width, true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPlayLevel(page, 1);
  await finishPlayRound(page);
  await expect(
    page.getByRole("heading", { name: "Level passed", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-size="large"] [data-pixel-pose]')).toHaveCSS(
    "height",
    "140px",
  );
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await theme(page, "dark");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const chestResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/chest") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Open chest after Level 1", exact: true })
    .click();
  const chest = chestResultSchema.parse(await (await chestResponse).json());
  const prize = page.locator("[data-chest-prize]");
  await expect(prize).toBeVisible();
  await expect(prize.locator("strong")).toHaveText(`+${chest.xp} XP`);
  await expect(
    page.getByRole("dialog", { name: "Level up!", exact: true }),
  ).toHaveCount(0);
  // Freeze the actual CSS opening at its middle frame for a deterministic screenshot.
  await page.evaluate(() =>
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 300;
    }),
  );
  await shot(page, "chest-mid", 1440);
  await expect(prize).toHaveCount(0, { timeout: 4000 });
  await expect(
    page.getByRole("dialog", { name: "Level up!", exact: true }),
  ).toBeVisible();
  await dismissLevelUp(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPlayLevel(page, 2);
  let view = await playView(page);
  if (view.question.type === "math" && view.question.units[0].id === "nodes") {
    await fillPlayAnswer(page, view);
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    view = await playView(page);
  }
  const sessionId = view.sessionId;
  const paused = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/activity") &&
      r.request().method() === "POST" &&
      r.request().postDataJSON().visible === false,
  );
  await page.getByRole("link", { name: "Close round", exact: true }).click();
  await paused;
  const aged = await context.request.post(
    "https://127.0.0.1:4444/fixture/play-age",
    { data: { sessionId } },
  );
  expect(aged.status()).toBe(200);
  await openPlayLevel(page, 2);
  view = await playView(page);
  expect(view.question.revision).toBe(1);
  expect(view.question.elapsedMs).toBeLessThan(1000);
  await expect(page.getByLabel("Time on this drill")).toContainText("Resumed");
  for (const width of [1440, 375]) await shot(page, "resumed-timer", width);
  await page.clock.install();
  const hide = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/activity") &&
      r.request().postDataJSON().visible === false,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await hide;
  await page.clock.runFor(50);
  const frozen = await page.getByLabel("Time on this drill").textContent();
  await page.clock.runFor(30000);
  await expect(page.getByLabel("Time on this drill")).toHaveText(frozen ?? "");
  const show = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/activity") &&
      r.request().postDataJSON().visible === true,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await show;
  await page.clock.resume();
  await fillPlayAnswer(page, view);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  const sheet = page.getByLabel("Drill result");
  await expect(sheet).toHaveAttribute("data-correct", "true");
  await sheet.locator("summary").click();
  await expect(sheet.locator("code")).toContainText(" = about ");
  expect(
    (await sheet.locator("code").textContent())?.split(" = ")[0],
  ).not.toMatch(/\b(q|tin|tout|docs|dims|pct|raw|ov|mem|n|t|g)\b/);
  for (const color of ["dark", "light"] as const) {
    await theme(page, color);
    await expect(
      sheet.getByRole("button", { name: "Continue", exact: true }),
    ).toHaveCSS("background-color", "rgb(19, 117, 58)");
    for (const width of [1440, 375])
      await shot(page, `math-result-${color}`, width);
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  view = await playView(page);
  const outcomes = view.outcomes;
  await fillPlayAnswer(page, view);
  // A stale submit must load the regenerated revision instead of an endless Retry loop.
  await context.request.post("https://127.0.0.1:4444/fixture/play-age", {
    data: { sessionId },
  });
  const conflict = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/submit") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  expect((await conflict).status()).toBe(409);
  await expect(
    page.getByRole("button", { name: "Retry grading", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  const latest = await playView(page);
  expect(latest.question.revision).toBe(2);
  expect(latest.outcomes).toEqual(outcomes);
  await finishPlayRound(page);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  const secondResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/chest") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Open chest after Level 2", exact: true })
    .click();
  const second = chestResultSchema.parse(await (await secondResponse).json());
  await expect(prize).toBeVisible();
  expect(
    await prize.evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await expect(prize).toHaveCount(0, { timeout: 4000 });
  if ((second.totals.xpLevel?.level ?? 2) > 2)
    await expect(
      page.getByRole("dialog", { name: "Level up!", exact: true }),
    ).toBeVisible();
  await dismissLevelUp(page);
  expect(errors).toEqual([]);
});
