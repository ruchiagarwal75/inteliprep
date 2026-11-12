import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import {
  capturePlay,
  finishPlayRound,
  openPlayLevel,
  playView,
  fillPlayAnswer,
  dismissLevelUp,
} from "./play-helpers";
test("Play keeps first-drill handoff, first-try rules, daily goal and keyboard play", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await signIn(context, "playRound");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const profile = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/profile") && r.request().method() === "POST",
  );
  await page.goto("/play/rag");
  await profile;
  await expect(
    page.getByLabel("Daily goal: 0 of 1 rounds complete", { exact: true }),
  ).toBeVisible();
  let starts = 0,
    reads = 0,
    profiles = 0;
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path === "/api/play/round") {
      if (r.method() === "POST") starts++;
      else reads++;
    }
    if (path === "/api/play/profile") profiles++;
  });
  const start = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/play/round" &&
      r.request().method() === "POST",
  );
  await openPlayLevel(page, 1);
  const response = await start;
  expect(response.headers()["server-timing"]).toContain("dbWorkMs;dur=");
  expect(response.headers()["x-request-id"]).toBeTruthy();
  expect(starts).toBe(1);
  expect(reads).toBe(0);
  expect(profiles).toBe(0);
  await expect(
    page.getByRole("progressbar", { name: "Round progress" }),
  ).toHaveAttribute("aria-valuemax", "5");
  await finishPlayRound(page, false, false);
  await expect(
    page.getByRole("heading", { name: "Keep practicing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Drills to review", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("You got 0 of 5. Get 4 to pass.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  await finishPlayRound(page);
  await expect(
    page.getByRole("heading", { name: "Level passed", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("65 XP earned", { exact: true })).toBeVisible();
  await expect(page.getByText(/Includes.*first-try pass/u)).toHaveCount(0);
  const reward = page.getByLabel("New badges", { exact: true });
  await expect(
    reward.getByRole("heading", { name: "First level cleared", exact: true }),
  ).toBeVisible();
  await expect(reward.getByRole("button")).toHaveCount(0);
  await page.getByRole("link", { name: "Back to levels", exact: true }).click();
  await expect(
    page.getByLabel("Daily goal: 1 of 1 rounds complete", { exact: true }),
  ).toBeVisible();
  const flame = page
    .getByRole("img", { name: "1-day streak", exact: true })
    .locator("svg");
  await expect(flame).toHaveCSS("color", "rgb(194, 65, 12)");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(flame).toHaveCSS("color", "rgb(251, 146, 60)");
  await capturePlay(page, "path-dark", "play-game-redesign");
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await openPlayLevel(page, 1);
  let keyboardPlayed = false;
  for (let i = 0; i < 5; i++) {
    const view = await playView(page),
      answer = await fillPlayAnswer(page, view);
    if (view.question.type === "spot_flaw") {
      keyboardPlayed = true;
      await page
        .getByRole("heading", { name: view.question.title, exact: true })
        .click();
      await page.keyboard.press(String(Number(answer.option) + 1));
      await expect(
        page.getByRole("radio").nth(Number(answer.option)),
      ).toBeChecked();
      await page.keyboard.press("Enter");
      await dismissLevelUp(page);
      await expect(page.getByLabel("Drill result")).toHaveAttribute(
        "data-correct",
        "true",
      );
      await expect(
        page.getByRole("button", { name: "Continue", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
      if (i < 4)
        await expect(
          page.getByRole("button", { name: "Check answer", exact: true }),
        ).toBeVisible();
      break;
    }
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await dismissLevelUp(page);
    await expect(page.getByLabel("Drill result")).toHaveAttribute(
      "data-correct",
      "true",
    );
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Check answer", exact: true }),
    ).toBeVisible();
  }
  expect(keyboardPlayed).toBe(true);
  expect(errors).toEqual([]);
});
