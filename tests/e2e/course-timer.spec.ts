import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { openPlayLevel, playView, fillPlayAnswer } from "./play-helpers";
import { modelCalls } from "./course-evidence";

test("an eight-second slide pause freezes display and server time despite a slow heartbeat", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await signIn(context, "courseTimer");
  await page.setViewportSize({ width: 1440, height: 669 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  mkdirSync("artifacts/rag-course-3", { recursive: true });
  const before = await modelCalls(page);
  let release = () => {},
    ready = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    ready = resolve;
  });
  let delayed = false;
  await page.route("**/api/play/activity", async (route) => {
    const input: { visible: boolean } = route.request().postDataJSON();
    if (input.visible && !delayed) {
      delayed = true;
      const response = await route.fetch();
      ready();
      await held;
      try {
        await route.fulfill({ response });
      } catch {
        /* The paused client cancels this old response. */
      }
    } else await route.continue();
  });
  try {
    await openPlayLevel(page, 1);
    await waiting;
    await page.waitForTimeout(3000);
    const timer = page.getByLabel("Time on this drill", { exact: true });
    const elapsed = async () =>
      (await timer.textContent())?.match(/^\d+:\d+/u)?.[0] ?? "";
    await page.screenshot({ path: "artifacts/rag-course-3/timer-before.png" });
    const stopped = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/play/activity") &&
        response.request().postDataJSON()?.visible === false,
    );
    await page.getByRole("button", { name: "Slides", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Topic 1 slides",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(timer).toContainText("Paused for slides");
    const frozen = await elapsed();
    await page.waitForTimeout(4000);
    release();
    await page.waitForTimeout(4000);
    expect(await elapsed()).toBe(frozen);
    const paused: { elapsedMs: number } = await (await stopped).json();
    const [minutes, seconds] = frozen.split(":").map(Number);
    expect(paused.elapsedMs).toBeLessThan(
      (minutes * 60 + seconds) * 1000 + 1500,
    );
    await dialog
      .getByRole("button", { name: "Close slides", exact: true })
      .click();
    await page.screenshot({ path: "artifacts/rag-course-3/timer-after.png" });
    await page.waitForTimeout(2100);
    expect(await elapsed()).not.toBe(frozen);
    const view = await playView(page);
    await fillPlayAnswer(page, view);
    const submitted = page.waitForResponse((response) =>
      response.url().endsWith("/api/play/submit"),
    );
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    const saved: { result: { timeMs: number } } = await (
      await submitted
    ).json();
    expect(saved.result.timeMs).toBeLessThan(paused.elapsedMs + 4000);
    expect(await modelCalls(page)).toBe(before);
  } finally {
    release();
  }
});
