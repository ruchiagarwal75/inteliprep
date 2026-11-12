import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { openPlayLevel, finishPlayRound, dismissLevelUp } from "./play-helpers";
import { captureCourse, modelCalls } from "./course-evidence";
test.use({ actionTimeout: 15000 });
test("three course topics unlock in order, preserve stars and celebrate a single chest reward", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await signIn(context, "playGame");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  // A complete 28-question story exceeds 120 requests/minute at machine speed.
  // Serialize synthetic transport delays instead of weakening production quotas.
  let transport = Promise.resolve();
  await page.route("**/api/play/**", async (route) => {
    transport = transport.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 800)),
    );
    await transport;
    await route.continue();
  });
  await page.goto("/play/rag");
  await expect(page.getByLabel("0 / 27 stars", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Topic 2:/u })).toHaveCount(0);
  const node = page.getByRole("link", { name: /^Topic 1:/u });
  await expect(node).toHaveCSS("width", "96px");
  for (const theme of ["dark", "light"] as const) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page
        .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
        .click();
    await captureCourse(page, `path-${theme}`);
  }
  for (const level of [1, 2, 3]) {
    await openPlayLevel(page, level);
    await finishPlayRound(page);
    await expect(
      page.getByRole("heading", { name: "Topic passed", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "3 of 3 stars", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Continue", exact: true }).click();
  }
  await expect(page.getByLabel("9 / 27 stars", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("3 of 9 topics passed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Topic 4: Re-ranking, coming soon", { exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/chest") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Open chest after Topic 3", exact: true })
    .click();
  const chestResponse = await response;
  expect(chestResponse.status()).toBe(200);
  const prize: { xp: number; totals: { points: number } } =
    await chestResponse.json();
  await expect(page.locator("[data-chest-prize]")).toBeVisible();
  await expect(page.locator("[data-chest-prize] strong")).toHaveText(
    `+${prize.xp} XP`,
  );
  await expect(page.locator("[data-chest-prize]")).toHaveCount(0, {
    timeout: 4000,
  });
  await dismissLevelUp(page);
  const repeated = await page.request.post("/api/play/chest", {
    headers: { Origin: "http://localhost:3100" },
    data: { topic: "rag-course", afterLevel: 3 },
  });
  expect((await repeated.json()).totals.points).toBe(prize.totals.points);
  const invalid = await page.request.post("/api/play/chest", {
    headers: { Origin: "http://localhost:3100" },
    data: { topic: "rag-course", afterLevel: 1 },
  });
  expect(invalid.status()).toBe(404);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPlayLevel(page, 1);
  await finishPlayRound(page);
  await expect(page.getByLabel("54 XP earned", { exact: true })).toBeVisible();
  await expect(page.getByText(/Includes.*first-try pass/u)).toHaveCount(0);
  await page.getByRole("link", { name: "Open Progress", exact: true }).click();
  await expect(page.getByText("Needs practice", { exact: true })).toBeVisible();
  await expect(page.getByText("Practice ready", { exact: true })).toHaveCount(
    0,
  );
  expect(await modelCalls(page)).toBe(before);
});
test("choice checks show a disabled pending button and retry a network failure without a model", async ({
  page,
  context,
}) => {
  await signIn(context, "playThinking");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  await openPlayLevel(page, 1);
  await page.getByRole("radio").first().check();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/play/submit",
    async (route) => {
      await gate;
      await route.continue();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Checking...", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.getByLabel("Drill result", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.route("**/api/play/submit", (route) => route.abort(), {
    times: 1,
  });
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry grading", exact: true })
    .click();
  await expect(page.getByLabel("Drill result", { exact: true })).toBeVisible();
  expect(await modelCalls(page)).toBe(before);
});
