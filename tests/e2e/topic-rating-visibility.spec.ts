import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { openPlayLevel, finishPlayRound } from "./play-helpers";
import { modelCalls } from "./course-evidence";

for (const account of ["topicRatingUnanswered", "topicRatingEscape"] as const)
  test(`records a visible popup and ${account === "topicRatingEscape" ? "Escape" : "leaving without an answer"}`, async ({
    page,
    context,
  }) => {
    await signIn(context, account, { firstTopicRating: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const calls = await modelCalls(page);
    let displays = 0;
    page.on("request", (r) => {
      if (
        r.url().endsWith("/api/play/topic-rating") &&
        r.method() === "POST" &&
        r.postDataJSON()?.action === "shown"
      )
        displays++;
    });
    if (account === "topicRatingUnanswered")
      await page.addInitScript(() =>
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => true,
        }),
      );
    await openPlayLevel(page, 0);
    const shown = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/play/topic-rating") &&
        r.request().method() === "POST" &&
        r.request().postDataJSON()?.action === "shown",
    );
    await finishPlayRound(page);
    const modal = page.getByRole("dialog", {
      name: "How was your practice so far?",
      exact: true,
    });
    await expect(modal).toBeVisible();
    if (account === "topicRatingUnanswered") {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(displays).toBe(0);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => false,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
    }
    expect((await shown).status()).toBe(200);
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    expect(displays).toBe(1);
    if (account === "topicRatingEscape") {
      const closed = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/topic-rating") &&
          r.request().postDataJSON()?.action === "close",
      );
      await page.keyboard.press("Escape");
      expect((await closed).status()).toBe(200);
      await expect(modal).toHaveCount(0);
    } else await page.goto("/play/rag");
    expect(await modelCalls(page)).toBe(calls);
  });

test("admin distinguishes a closed popup from one with no recorded response", async ({
  page,
  context,
}) => {
  await signIn(context, "admin");
  await page.goto("/admin/feedback?search=rating-view");
  const ratings = page.getByRole("region", {
    name: "First topic quiz ratings",
    exact: true,
  });
  await expect(ratings).toContainText(
    "2 shown · 0 rated · 0 skipped · 1 closed · 1 with no response",
  );
  await expect(ratings.locator("[data-topic-rating-id]")).toHaveCount(2);
  await expect(ratings).toContainText("Closed with X or Escape");
  await expect(ratings).toContainText("Shown, no response recorded");
  await expect(ratings).toContainText("rating-view-unanswered@example.invalid");
});
