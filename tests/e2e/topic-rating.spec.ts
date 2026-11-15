import { expect, test, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { openPlayLevel, finishPlayRound } from "./play-helpers";
import { modelCalls } from "./course-evidence";
import { fixtureAccounts } from "./fixture-accounts.mjs";
import { topicRatingKey } from "../../src/lib/play/topic-rating-public";

for (const [account, theme, width, stars] of [
  ["topicRatingLightDesktop", "light", 1440, 5],
  ["topicRatingDarkPhone", "dark", 375, 3],
  ["topicRatingLightPhone", "light", 375, null],
  ["topicRatingDarkDesktop", "dark", 1440, null],
] as const)
  test(`first quiz rating ${theme} ${width}`, async ({
    page,
    context,
    browser,
  }) => {
    await signIn(context, account, { firstTopicRating: true });
    await context.addCookies([
      { name: "mockmeai-theme", value: theme, url: "http://localhost:3100" },
    ]);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const calls = await modelCalls(page);
    await openPlayLevel(page, 0);
    const sessionId = new URL(page.url()).searchParams.get("session");
    expect(sessionId).toBeTruthy();
    const url = `/api/play/topic-rating?sessionId=${sessionId}`;
    expect(await (await context.request.get(url)).json()).toEqual({
      eligible: false,
    });
    expect(
      (
        await context.request.post("/api/play/topic-rating", {
          headers: { origin: "http://localhost:3100" },
          data: { sessionId, action: "rate", stars: 5 },
        })
      ).status(),
    ).toBe(409);
    await finishPlayRound(page, false, account !== "topicRatingDarkDesktop");
    const modal = page.getByRole("dialog", {
      name: "How was your practice so far?",
      exact: true,
    });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("button", { name: /stars?$/ })).toHaveCount(5);
    await expect(modal.getByRole("textbox")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Round results", exact: true }),
    ).toBeVisible();
    const fits = await modal.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        r.width <= 360 &&
        r.left >= 0 &&
        r.right <= innerWidth &&
        r.top >= 0 &&
        r.bottom <= innerHeight
      );
    });
    expect(fits).toBe(true);
    mkdirSync("artifacts/topic-rating", { recursive: true });
    await page.screenshot({
      path: `artifacts/topic-rating/${theme}-${width}.png`,
    });
    let stalledRating: Route | undefined;
    if (account === "topicRatingLightPhone") {
      await page.route("**/api/play/topic-rating", (route) => {
        if (
          route.request().method() === "POST" &&
          route.request().postDataJSON()?.action === "rate"
        ) {
          stalledRating = route;
          return;
        }
        return route.continue();
      });
      await modal.getByRole("button", { name: "2 stars", exact: true }).click();
      await expect(
        modal.getByRole("button", { name: "2 stars", exact: true }),
      ).toBeDisabled();
    }
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/play/topic-rating") &&
        r.request().method() === "POST",
    );
    if (stars !== null) {
      const choice = modal.getByRole("button", {
        name: `${stars} stars`,
        exact: true,
      });
      if (account === "topicRatingDarkPhone") {
        await page.route("**/api/play/topic-rating", (route) => route.abort(), {
          times: 1,
        });
        await choice.click();
        await expect(modal.getByRole("alert")).toHaveText(
          "Couldn't save your rating. Please try again.",
        );
      }
      await choice.focus();
      await page.keyboard.press("Enter");
      expect((await saved).status()).toBe(200);
      await expect(modal.getByRole("status")).toHaveText("Thanks!");
    } else {
      await modal
        .getByRole("button", {
          name: account === "topicRatingLightPhone" ? "Skip" : "Close dialog",
          exact: true,
        })
        .click();
      expect((await saved).status()).toBe(200);
    }
    await expect(modal).toHaveCount(0);
    if (stalledRating) {
      const resumed = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/topic-rating") &&
          r.request().postDataJSON()?.action === "rate",
      );
      await stalledRating.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ handled: true }),
      });
      await resumed;
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect(modal).toHaveCount(0);
    }
    expect(await (await context.request.get(url)).json()).toEqual({
      eligible: false,
    });
    // A duplicate cannot overwrite either a rating or a skip.
    expect(
      (
        await context.request.post("/api/play/topic-rating", {
          headers: { origin: "http://localhost:3100" },
          data: { sessionId, action: "rate", stars: 1 },
        })
      ).status(),
    ).toBe(200);
    expect(await modelCalls(page)).toBe(calls);
    const fresh = await browser.newContext();
    try {
      await signIn(fresh, account, { firstTopicRating: true });
      expect(
        await (await fresh.request.get(`http://localhost:3100${url}`)).json(),
      ).toEqual({ eligible: false });
      await signIn(fresh, "invited", { firstTopicRating: true });
      expect(
        (await fresh.request.get(`http://localhost:3100${url}`)).status(),
      ).toBe(404);
      expect(
        (
          await fresh.request.post(
            "http://localhost:3100/api/play/topic-rating",
            {
              headers: { origin: "http://localhost:3100" },
              data: { sessionId, action: "skip" },
            },
          )
        ).status(),
      ).toBe(404);
    } finally {
      await fresh.close();
    }
    await page.evaluate(
      (key) => localStorage.removeItem(key),
      topicRatingKey(fixtureAccounts[account].id),
    );
    await page.reload();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Round results", exact: true }),
    ).toBeVisible();
    expect(await (await context.request.get(url)).json()).toEqual({
      eligible: false,
    });
    await expect(modal).toHaveCount(0);
    if (account === "topicRatingLightDesktop") {
      await openPlayLevel(page, 1);
      await finishPlayRound(page);
      await expect(
        page.getByRole("region", { name: "Round results", exact: true }),
      ).toBeVisible();
      await expect(modal).toHaveCount(0);
    }
  });

test("admin can read the saved quiz ratings while normal accounts cannot", async ({
  page,
  context,
}) => {
  await signIn(context, "invited");
  const denied = await page.goto("/admin/feedback");
  expect(denied?.status()).toBe(404);
  await signIn(context, "admin");
  await page.goto("/admin/feedback?search=topic-rating");
  const ratings = page.getByRole("region", {
    name: "First topic quiz ratings",
    exact: true,
  });
  await expect(ratings).toContainText("4.0 / 5 average");
  await expect(ratings).toContainText("2 rated · 2 skipped");
  await expect(ratings.locator("[data-topic-rating-id]")).toHaveCount(4);
  await expect(ratings).toContainText("5 / 5 stars");
  await expect(ratings).toContainText("3 / 5 stars");
  await expect(ratings).toContainText(
    "topic-rating-light-desktop@example.invalid",
  );
  await page.screenshot({
    path: "artifacts/topic-rating/admin.png",
    fullPage: true,
  });
});
