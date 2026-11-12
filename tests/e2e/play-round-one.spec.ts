import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { capturePlay, finishPlayRound } from "./play-helpers";
test("Play round fixes: first-drill handoff, dots, fail, pass, rewards, daily goal and keyboard", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await signIn(context, "playRound");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const profile = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/play/profile") && r.request().method() === "POST",
  );
  await page.goto("/play/rag");
  await profile;
  await expect(
    page.getByLabel("Daily goal: 0 of 1 rounds complete", { exact: true }),
  ).toBeVisible();
  await capturePlay(page, "fixes-level-path");
  const first = page
    .getByRole("list", { name: "Level path" })
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { name: "Retrieval basics", exact: true }),
    });
  let starts = 0,
    reads = 0,
    profiles = 0;
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path === "/api/play/round") {
      if (r.method() === "POST") starts++;
      else if (r.method() === "GET") reads++;
    }
    if (path === "/api/play/profile") profiles++;
  });
  await first.getByRole("button", { name: "Start level", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  expect(starts).toBe(1);
  expect(reads).toBe(0);
  expect(profiles).toBe(0);
  await expect(
    page.getByRole("list", { name: "Round progress" }).getByRole("listitem"),
  ).toHaveCount(5);
  await capturePlay(page, "fixes-round-dots");
  await finishPlayRound(page, false, false);
  await expect(
    page.getByRole("heading", { name: "Keep practicing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Drills to review", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0 of 5", { exact: false })).toBeVisible();
  await expect(
    page.getByLabel("Daily goal: 1 of 1 rounds complete", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("1-day streak", { exact: true })).toBeVisible();
  await capturePlay(page, "fixes-level-failed");
  const previousSession = new URL(page.url()).searchParams.get("session");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.waitForURL(
    (url) =>
      url.pathname === "/play/rag/drill" &&
      url.searchParams.get("session") !== previousSession,
  );
  // Hold the first response so the pending state is observable without a real model.
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let checking = false;
  await page.route("**/api/play/submit", async (route) => {
    if (!checking) {
      checking = true;
      await expect(
        page.getByRole("button", {
          name: "Checking your answer...",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Checking your answer...",
          exact: true,
        }),
      ).toBeDisabled();
      release();
    }
    await route.continue();
  });
  await finishPlayRound(page, true);
  await held;
  await page.unroute("**/api/play/submit");
  await expect(
    page.getByRole("heading", { name: "Level passed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Level 2", exact: true }),
  ).toBeVisible();
  // A replay after failure has no first-try bonus.
  await expect(
    page.getByText("50 points earned this round", { exact: true }),
  ).toBeVisible();
  const reward = page.getByLabel("New badges", { exact: true });
  await expect(
    reward.getByRole("heading", { name: "First level cleared", exact: true }),
  ).toBeVisible();
  await expect(
    reward.getByText("Clear your first practice level.", { exact: true }),
  ).toBeVisible();
  await expect(reward.getByRole("button")).toHaveCount(0);
  const flame = page
    .getByRole("img", { name: "1-day streak", exact: true })
    .locator("svg");
  await expect(flame).toHaveCSS("color", "rgb(194, 65, 12)");
  await capturePlay(page, "badge-light", "play-round2");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(flame).toHaveCSS("color", "rgb(251, 146, 60)");
  await capturePlay(page, "badge-dark", "play-round2");
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await capturePlay(page, "fixes-level-passed");
  await page
    .getByRole("button", { name: "Start Level 2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to levels", exact: true }).click();
  await first
    .getByRole("button", { name: "Replay level", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  let keyboardPlayed = false;
  // Advance only with stubbed/deterministic answers until a multiple-choice drill appears.
  for (let index = 0; index < 5; index++) {
    const session = new URL(page.url()).searchParams.get("session");
    const view = await (
      await page.request.get("/api/play/round?sessionId=" + session)
    ).json();
    const solution = await (
      await page.request.get(
        "https://127.0.0.1:4444/fixture/play-answer?attempt=" +
          view.question.attemptId,
      )
    ).json();
    if (view.question.type === "spot_flaw") {
      keyboardPlayed = true;
      await page
        .getByRole("heading", { name: view.question.title, exact: true })
        .click();
      await page.keyboard.press(String(Number(solution.option) + 1));
      await expect(
        page.getByRole("radio").nth(Number(solution.option)),
      ).toBeChecked();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.keyboard.press("Enter");
      await expect(page.locator('[class*="flight"]')).toHaveCount(1);
      await expect(
        page.getByRole("heading", { name: "Correct", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Continue", exact: true }),
      ).toBeFocused();
      await expect(page.locator('[class*="flight"]')).toHaveCount(0);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await capturePlay(page, "fixes-correct-reward-nav");
      await page.keyboard.press("Enter");
      if (index < 4)
        await expect(
          page.getByRole("button", { name: "Check answer", exact: true }),
        ).toBeVisible();
      break;
    }
    if (solution.type === "math")
      await page
        .getByRole("spinbutton", { name: "Value", exact: true })
        .fill(String(solution.value));
    else if (solution.type === "pick_probe")
      await page
        .getByLabel("Your follow-up question", { exact: true })
        .fill(solution.text);
    else {
      await page
        .getByLabel("Your call", { exact: true })
        .fill(solution.decision);
      await page
        .getByLabel("Your reason, in 1 to 3 sentences", { exact: true })
        .fill(solution.reason);
    }
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Correct", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  expect(keyboardPlayed).toBe(true);
  expect(errors).toEqual([]);
});
