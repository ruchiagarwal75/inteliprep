import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { WELCOME_PANELS } from "../../src/lib/play/welcome-copy";
async function open(
  page: Page,
  context: BrowserContext,
  account: string,
  theme = "light",
  width = 1440,
  reduced = true,
) {
  await signIn(context, account);
  await context.addCookies([
    { name: "mockmeai-theme", value: theme, url: "http://localhost:3100" },
  ]);
  await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
  await page.emulateMedia({
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  await page.goto("/play");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "WELCOME, ENGINEER", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function toPanel(page: Page, panel: number) {
  for (let n = 0; n < 12; n++) {
    if (await page.getByLabel(`Panel ${panel} of 4`, { exact: true }).count())
      return;
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  throw Error("Panel did not advance");
}
async function toEnd(page: Page) {
  await toPanel(page, 4);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start Topic 0", exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page, account: string) {
  const response = await page.request.get(
    `https://127.0.0.1:4444/fixture/welcome?account=${account}`,
  );
  expect(response.ok()).toBe(true);
  return response.json();
}
async function shot(page: Page, name: string) {
  mkdirSync("artifacts/welcome-intro", { recursive: true });
  const fits = await page.getByRole("dialog").evaluate((dialog) => {
    const r = dialog.getBoundingClientRect();
    return (
      r.left >= 0 &&
      r.right <= innerWidth &&
      r.top >= 0 &&
      r.bottom <= innerHeight &&
      dialog.scrollHeight <= dialog.clientHeight
    );
  });
  expect(fits).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const text = page.getByRole("dialog").locator('[aria-live="polite"]');
  const lines = await text.evaluate(
    (el) =>
      el.getBoundingClientRect().height /
      parseFloat(getComputedStyle(el).lineHeight),
  );
  expect(lines).toBeLessThanOrEqual(2.1);
  await page.screenshot({
    path: `artifacts/welcome-intro/${name}.png`,
    animations: "disabled",
  });
}
for (const [theme, width, account] of [
  ["light", 1440, "welcomeLightDesktop"],
  ["dark", 1440, "welcomeDarkDesktop"],
  ["light", 375, "welcomeLightPhone"],
  ["dark", 375, "welcomeDarkPhone"],
] as const) {
  test(`four welcome panels: ${theme}, ${width}`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await open(page, context, account, theme, width);
    const before = await modelCalls(page);
    for (const [index, content] of WELCOME_PANELS.entries()) {
      const panel = index + 1;
      await toPanel(page, panel);
      await expect(
        page.getByRole("heading", { name: content.title, exact: true }),
      ).toBeVisible();
      for (const [beatIndex, beat] of content.beats.entries()) {
        if (beatIndex > 0)
          await page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(
          page.getByText(beat.speaker, { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("dialog").locator('[aria-live="polite"]'),
        ).toHaveText(beat.line);
        const suffix = beatIndex === 0 ? "" : `-beat-${beatIndex + 1}`;
        await shot(page, `panel-${panel}${suffix}-${theme}-${width}`);
      }
      expect(
        await page
          .getByRole("dialog")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe("rgb(23, 20, 58)");
    }
    await shot(page, `panel-4-ready-${theme}-${width}`);
    await page
      .getByRole("button", { name: "Look around first", exact: true })
      .click();
    await page.waitForURL(/\/play$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const saved = await snapshot(page, account);
    expect(saved.runs).toHaveLength(1);
    expect(saved.runs[0].outcome).toBe("completed");
    expect(
      saved.events.filter(
        (e: { event: string }) => e.event === "first_topic_started_from_intro",
      ),
    ).toHaveLength(0);
    expect(await modelCalls(page)).toBe(before);
    expect(errors).toEqual([]);
  });
}
for (const panel of [1, 2, 3, 4])
  test(`skip panel ${panel} stays seen on a second browser`, async ({
    page,
    context,
    browser,
  }) => {
    const account = `welcomeSkip${panel}`;
    await open(page, context, account);
    await toPanel(page, panel);
    const pending = page.waitForRequest(
      (r) => r.url().endsWith("/api/play/welcome") && r.method() === "POST",
    );
    if (panel % 2)
      await page.getByRole("button", { name: "Skip", exact: true }).click();
    else await page.keyboard.press("Escape");
    const body = (await pending).postDataJSON();
    await page.waitForURL(/\/play$/);
    // A lost response or repeated command must not add a second ending event.
    expect(
      (
        await page.request.post("/api/play/welcome", {
          headers: { Origin: "http://localhost:3100" },
          data: body,
        })
      ).ok(),
    ).toBe(true);
    const second = await browser.newContext({ ignoreHTTPSErrors: true });
    try {
      await signIn(second, account);
      const other = await second.newPage();
      await other.goto("/play");
      await expect(
        other.getByRole("heading", {
          name: "Level up for the AI engineer interview.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(other.getByRole("dialog")).toHaveCount(0);
    } finally {
      await second.close();
    }
    const data = await snapshot(page, account);
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0]).toMatchObject({ outcome: "skipped", panel });
    expect(
      data.events.filter((e: { event: string }) => e.event === "intro_skipped"),
    ).toEqual([{ event: "intro_skipped", panel, count: 1 }]);
  });
test("Start Topic 0 opens Learn and records its first real view once", async ({
  page,
  context,
}) => {
  await open(page, context, "welcomeStart");
  const before = await modelCalls(page);
  await toEnd(page);
  await page
    .getByRole("button", { name: "Start Topic 0", exact: true })
    .click();
  await page.waitForURL(/\/play\/rag\/topics\/0\?intro=/);
  await expect(
    page.getByRole("heading", { name: "Topic 0 · RAG basics", exact: true }),
  ).toBeVisible();
  await page.reload();
  const data = await snapshot(page, "welcomeStart");
  expect(data.state[0].welcome_seen_at).toBeTruthy();
  expect(
    data.events.filter(
      (e: { event: string }) => e.event === "first_topic_started_from_intro",
    ),
  ).toEqual([
    { event: "first_topic_started_from_intro", panel: null, count: 1 },
  ]);
  expect(await modelCalls(page)).toBe(before);
});
test("keyboard reveals before advancing, traps focus, goes back and respects reduced motion", async ({
  page,
  context,
}) => {
  await open(page, context, "welcomeKeys", "dark", 375, false);
  await expect(
    page.getByRole("button", { name: "Show full dialogue", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Continue dialogue", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Panel 1 of 4", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Let's get you ready for AI system design interviews.", {
      exact: true,
    }),
  ).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Panel 2 of 4", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("Panel 1 of 4", { exact: true })).toBeVisible();
  for (let n = 0; n < 12; n++) {
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await page
    .getByRole("dialog")
    .locator("*")
    .evaluateAll((nodes) =>
      nodes.every((el) => getComputedStyle(el).animationName === "none"),
    );
  expect(animations).toBe(true);
  await page.keyboard.press("Escape");
  await page.waitForURL(/\/play$/);
});
test("existing progress skips automatic welcome and Replay intro is explicit", async ({
  page,
  context,
}) => {
  await signIn(context, "welcomeExisting");
  await page.goto("/play");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await snapshot(page, "welcomeExisting")).runs).toHaveLength(0);
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page.getByRole("link", { name: "Replay intro", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toPanel(page, 2);
  await expect(
    page.getByText("Our first world is RAG.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-pixel-pose="cheer"]')).toBeVisible();
  await expect(page.locator('[data-boss-pose="idle"]')).toHaveCount(0);
  await toPanel(page, 3);
  await expect(
    page.getByText("After training, you'll meet the Interviewer.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('[data-boss-pose="idle"]')).toBeVisible();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.waitForURL(/\/play$/);
  const data = await snapshot(page, "welcomeExisting");
  expect(data.runs[0]).toMatchObject({ kind: "replay", outcome: "skipped" });
});
test("a failed opening or dismissal can retry without duplicate runs", async ({
  page,
  context,
}) => {
  await signIn(context, "welcomeRetry");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/play/welcome/start", (route) => route.abort(), {
    times: 1,
  });
  await page.goto("/play");
  await page.getByRole("button", { name: "Retry intro", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.route("**/api/play/welcome", (route) => route.abort(), {
    times: 1,
  });
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Could not save. Please try again.",
  );
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.waitForURL(/\/play$/);
  expect((await snapshot(page, "welcomeRetry")).runs).toHaveLength(1);
});
test("admin funnel shows intro counts and denies a normal account", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context, "admin");
  await page.goto("/admin/funnel?includeExcluded=1");
  const counts = page.getByRole("region", {
    name: "Welcome story counts",
    exact: true,
  });
  await expect(counts).toBeVisible();
  await expect(
    counts.getByText("Intro completed", { exact: true }),
  ).toBeVisible();
  mkdirSync("artifacts/welcome-intro", { recursive: true });
  await page.screenshot({
    path: "artifacts/welcome-intro/admin-funnel.png",
    fullPage: true,
  });
  const other = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    await signIn(other, "welcomeExisting");
    const response = await (await other.newPage()).goto("/admin/funnel");
    expect(response?.status()).toBe(404);
    expect(
      (
        await other.request.get("http://localhost:3100/api/admin/funnel")
      ).status(),
    ).toBe(403);
  } finally {
    await other.close();
  }
});
