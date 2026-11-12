import { capturePixel as capturePlay } from "./capture-pixel";
import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { openPlayLevel, playView, fillPlayAnswer } from "./play-helpers";
const folder = "play-game-polish-round-3";
test("game path, sheets, three stars, chest, HUD and player level use server outcomes", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await signIn(context, "playGame");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/play/rag");
  const banner = page.getByRole("region", { name: "RAG World progress" });
  await expect(
    banner.getByRole("heading", { name: "RAG World" }),
  ).toBeVisible();
  await expect(
    banner.getByLabel("0 / 12 stars", { exact: true }),
  ).toBeVisible();
  await expect(banner.getByLabel("0 of 4 levels passed")).toBeVisible();
  const first = page.locator('summary[aria-label^="Level 1:"]');
  await expect(first).toHaveAttribute("aria-label", /current/u);
  await expect(page.locator('summary[aria-label^="Level 2:"]')).toHaveAttribute(
    "aria-label",
    /locked/u,
  );
  await expect(first).toHaveCSS("width", "96px");
  await expect(page.locator('summary[aria-label^="Level 2:"]')).toHaveCSS(
    "width",
    "80px",
  );
  await expect(first).not.toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(first).toHaveCSS("animation-name", "none");
  for (const name of [
    "Retrieval basics",
    "Scale math",
    "Permissions and freshness",
    "Quality and safety",
  ])
    await expect(
      page.getByText(name, { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  await expect(page.locator('[aria-label="Practice guide"] p')).toHaveCSS(
    "font-family",
    /Press Start 2P/,
  );
  await capturePlay(page, "rag-world-path", folder);
  await capturePlay(page, "hud", folder, false);
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Game sounds", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await openPlayLevel(page, 1);
  await expect(
    page.getByRole("navigation", { name: "Practice modes" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeDisabled();
  let selected = false;
  for (let i = 0; i < 5; i++) {
    const view = await playView(page);
    await fillPlayAnswer(page, view);
    const shot = !selected && view.question.type === "spot_flaw";
    if (shot) {
      await expect(
        page.getByRole("heading", { name: view.question.title, exact: true }),
      ).toHaveCSS("font-family", /Inter/);
      await expect(page.getByRole("radio").first().locator("..")).toHaveCSS(
        "font-family",
        /Inter/,
      );
      await capturePlay(page, "answer-selected", folder, false);
    }
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/play/submit") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    const body = await (await response).json();
    expect(body.result.correct).toBe(true);
    expect(body.result.combo).toBe(i + 1);
    if (i === 0)
      await expect(page.getByLabel("Combo: 1", { exact: true })).toHaveCount(0);
    if (i === 1)
      await expect(page.getByLabel("Combo: 2", { exact: true })).toBeVisible();
    const sheet = page.getByLabel("Drill result", { exact: true });
    await expect(sheet).toHaveAttribute("data-correct", "true");
    await expect(sheet.locator("details")).not.toHaveAttribute("open", "");
    await expect(
      page.getByRole("progressbar", { name: "Round progress" }),
    ).toHaveAttribute("aria-valuenow", String(i + 1));
    if (shot) {
      await expect(page.locator("article[data-result]")).toHaveCSS(
        "min-height",
        "0px",
      );
      await expect(page.locator("article[data-result]")).toHaveCSS(
        "border-top-width",
        "3px",
      );
      await expect(
        page.getByRole("heading", { name: view.question.title, exact: true }),
      ).toBeInViewport();
      await capturePlay(page, "correct-sheet", folder, false);
      selected = true;
    }
    if (i === 2)
      await expect(
        page.getByText("3 in a row! +5 XP", { exact: true }),
      ).toBeVisible();
    if (i === 4)
      await expect(
        page.getByText("5 in a row! +10 XP", { exact: true }),
      ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    if (i < 4)
      await expect(
        page.getByRole("button", { name: "Check answer", exact: true }),
      ).toBeVisible();
  }
  expect(selected).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Level passed", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("3 of 3 stars", { exact: true })).toBeVisible();
  await expect(page.getByLabel("90 XP earned", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Retrieval basics", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Best combo", { exact: true })).toBeVisible();
  await capturePlay(page, "level-complete-3-stars", folder);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await expect(
    banner.getByLabel("3 / 12 stars", { exact: true }),
  ).toBeVisible();
  await expect(banner.getByLabel("1 of 4 levels passed")).toBeVisible();
  await expect(page.locator('summary[aria-label^="Level 2:"]')).toHaveAttribute(
    "aria-label",
    /current/u,
  );
  await expect(page.locator('[data-revealed="true"]')).toHaveCount(1);
  await capturePlay(page, "rag-top", folder, false);
  await capturePlay(page, "path-light", folder);
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Switch to dark mode", exact: true })
        .click();
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('summary[aria-label^="Level 2:"]')).toHaveCSS(
        "width",
        width === 375 ? "96px" : "96px",
      );
      const label = page
        .getByRole("list", { name: "Level path" })
        .getByText("LV 1", { exact: true })
        .locator("..");
      expect(
        await label.evaluate((el) => getComputedStyle(el).backgroundColor),
      ).not.toBe("rgba(0, 0, 0, 0)");
      const bounds = await label.boundingBox();
      const chestBounds = await page
        .getByRole("button", { name: "Open chest after Level 1", exact: true })
        .boundingBox();
      if (!bounds || !chestBounds) throw Error("Missing path label or chest");
      expect(
        bounds.y + bounds.height <= chestBounds.y ||
          bounds.x + bounds.width <= chestBounds.x ||
          bounds.x >= chestBounds.x + chestBounds.width,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    if (theme === "dark") await capturePlay(page, "path-dark", folder);
  }
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await page.goto("/play");
  const worlds = page.getByRole("list", { name: "Practice worlds" });
  await expect(worlds.locator("li[data-world]")).toHaveCount(4);
  await expect(worlds.getByLabel("Coming soon", { exact: true })).toHaveCount(
    3,
  );
  await expect(
    worlds.getByText("1 of 4 levels passed", { exact: true }),
  ).toBeVisible();
  await expect(
    worlds.getByLabel("3 / 12 stars", { exact: true }),
  ).toBeVisible();
  await expect(
    worlds.getByRole("progressbar", { name: "RAG levels passed" }),
  ).toHaveAttribute("value", "1");
  const cardColors = await worlds
    .locator("li[data-world]")
    .evaluateAll((rows) =>
      rows.map((row) => getComputedStyle(row).backgroundColor),
    );
  expect(new Set(cardColors).size).toBe(4);
  for (const card of await worlds.locator("li[data-world]").all())
    await expect(card.locator("svg").first()).toBeVisible();
  await capturePlay(page, "topic-map", folder);
  await page.getByRole("link", { name: "Play RAG", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const chestResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/chest") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Open chest after Level 1", exact: true })
    .click();
  const chest = await (await chestResponse).json();
  expect(chest.xp).toBeGreaterThanOrEqual(20);
  expect(chest.xp).toBeLessThanOrEqual(50);
  const modal = page.getByRole("dialog", { name: "Level up!", exact: true });
  await expect(modal).toBeVisible();
  await expect(
    modal.getByLabel("You're now Lv 2", { exact: true }),
  ).toBeVisible();
  await expect(
    modal.getByText("Next: Lv 3 at 300 XP", { exact: true }),
  ).toBeVisible();
  await expect(modal.locator("[data-confetti]")).toBeVisible();
  await capturePlay(page, "player-level-up", folder, false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(modal.locator("[data-confetti]")).toBeHidden();
  await modal.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: `Chest opened: +${chest.xp} XP`,
      exact: true,
    }),
  ).toBeDisabled();
  await capturePlay(page, "chest-opened", folder);
  const repeated = await page.request.post("/api/play/chest", {
    headers: { Origin: "http://localhost:3100" },
    data: { topic: "rag", afterLevel: 1 },
  });
  expect((await repeated.json()).totals.points).toBe(chest.totals.points);
  await openPlayLevel(page, 1);
  let wrong = false;
  for (let i = 0; i < 5; i++) {
    const view = await playView(page);
    await fillPlayAnswer(page, view, false);
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    const sheet = page.getByLabel("Drill result");
    await expect(sheet).toHaveAttribute("data-correct", "false");
    await expect(sheet.locator("details")).toHaveAttribute("open", "");
    if (!wrong && view.question.type === "spot_flaw") {
      await expect(sheet.getByText("Answer:", { exact: true })).toBeVisible();
      await capturePlay(page, "wrong-sheet", folder, false);
      wrong = true;
    }
    await expect(page.getByLabel("Combo: 0", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    if (i < 4)
      await expect(
        page.getByRole("button", { name: "Check answer", exact: true }),
      ).toBeVisible();
  }
  expect(wrong).toBe(true);
  await expect(
    page.getByText("0 of 5. Get 4 to pass.", { exact: true }),
  ).toBeVisible();
  await capturePlay(page, "level-failed", folder);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("written grading shows Checking and thinking without a live model", async ({
  page,
  context,
}) => {
  await signIn(context, "playThinking");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const session = crypto.randomUUID(),
    attempt = crypto.randomUUID(),
    now = new Date().toISOString();
  await page.route(`**/api/play/round?sessionId=${session}`, (route) =>
    route.fulfill({
      json: {
        sessionId: session,
        mode: "level",
        status: "answering",
        outcomes: [null, null, null, null, null],
        combo: 0,
        question: {
          attemptId: attempt,
          drillId: "ui-written-fixture",
          topic: "rag",
          level: 1,
          title: "Probe the retrieval path",
          prompt:
            "Retrieval returns 50 candidates, then a reranker chooses 5. What would you ask next?",
          type: "pick_probe",
          ordinal: 0,
          total: 5,
          startedAt: now,
          serverNow: now,
          sample: false,
        },
      },
    }),
  );
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/play/submit", async (route) => {
    await gate;
    await route.fulfill({
      json: {
        result: {
          correct: true,
          score: 1,
          points: 10,
          combo: 1,
          comboBonus: 0,
          feedback: "You targeted a retrieval failure mode.",
          why: "Measure the recall of the first retrieval stage.",
          timeMs: 1000,
          badgesEarned: [],
        },
      },
    });
  });
  await page.goto(`/play/rag/drill?session=${session}`);
  await page
    .getByLabel("Your follow-up question", { exact: true })
    .fill(
      "How do you measure whether the right passage is absent from those 50 results?",
    );
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Checking...", exact: true }),
  ).toBeDisabled();
  await expect(page.locator('[data-pose="thinking"]')).toBeVisible();
  await capturePlay(page, "checking", folder, false);
  release();
  await expect(page.getByLabel("Drill result")).toHaveAttribute(
    "data-correct",
    "true",
  );
});
