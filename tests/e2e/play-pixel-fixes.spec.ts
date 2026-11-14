import { rendered } from "./rendered";
import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { openPlayLevel, playView, fillPlayAnswer } from "./play-helpers";
import { modelCalls } from "./course-evidence";
test.use({ actionTimeout: 15000 });
test("course timing pauses when hidden and stale resumes preserve submitted answers", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, "playPixelFixes");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  await openPlayLevel(page, 1);
  let view = await playView(page);
  await fillPlayAnswer(page, view);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  view = await playView(page);
  const sessionId = view.sessionId,
    outcomes = view.outcomes;
  const pause = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/activity") &&
      r.request().postDataJSON().visible === false,
  );
  await page.getByRole("link", { name: "Close round", exact: true }).click();
  await pause;
  expect(
    (
      await context.request.post("https://127.0.0.1:4444/fixture/play-age", {
        data: { sessionId },
      })
    ).status(),
  ).toBe(200);
  await openPlayLevel(page, 1);
  view = await playView(page);
  expect(view.question.revision).toBe(1);
  expect(view.outcomes).toEqual(outcomes);
  expect(view.question.elapsedMs).toBeLessThan(1000);
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
  const frozen = await rendered(
    page.getByLabel("Time on this drill"),
  ).textContent();
  await page.clock.runFor(30000);
  await expect(rendered(page.getByLabel("Time on this drill"))).toHaveText(
    frozen ?? "",
  );
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
  const updated = await playView(page);
  expect(updated.question.revision).toBe(2);
  expect(updated.outcomes).toEqual(outcomes);
  await fillPlayAnswer(page, updated);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  const sheet = rendered(page.getByLabel("Drill result", { exact: true }));
  await expect(sheet).toHaveAttribute("data-correct", "true");
  await expect(
    sheet.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  expect(await modelCalls(page)).toBe(before);
});
