import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import {
  openPlayLevel,
  finishPlayRound,
  playView,
  fillPlayAnswer,
  dismissLevelUp,
} from "./play-helpers";
import { modelCalls } from "./course-evidence";
test.use({ actionTimeout: 15000 });
test("failed quizzes retry without a first-try bonus, and keyboard choice controls never submit twice", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await signIn(context, "playRound");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  await openPlayLevel(page, 1);
  await finishPlayRound(page, false, false);
  await expect(
    page.getByRole("heading", { name: "Keep practicing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("0 of 7. Get 6 to pass.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  const view = await playView(page),
    answer = await fillPlayAnswer(page, view);
  await page
    .getByRole("heading", { name: view.question.title, exact: true })
    .click();
  await page.keyboard.press(String(Number(answer.option) + 1));
  await expect(
    page.getByRole("radio").nth(Number(answer.option)),
  ).toBeChecked();
  let submissions = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/play/submit") && r.method() === "POST")
      submissions++;
  });
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Drill result", { exact: true }),
  ).toHaveAttribute("data-correct", "true");
  expect(submissions).toBe(1);
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  await finishPlayRound(page);
  await dismissLevelUp(page);
  await expect(
    page.getByRole("heading", { name: "Topic passed", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("95 XP earned", { exact: true })).toBeVisible();
  await expect(page.getByText(/Includes.*first-try pass/u)).toHaveCount(0);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await expect(
    page.getByLabel("Daily goal: 1 of 1 rounds complete", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("1-day streak", { exact: true })).toBeVisible();
  const retired = await page.request.post("/api/play/round", {
    headers: { Origin: "http://localhost:3100" },
    data: {
      topic: "rag",
      level: 1,
      mode: "level",
      requestId: crypto.randomUUID(),
      timeZone: "UTC",
    },
  });
  expect(retired.status()).toBe(410);
  expect(await modelCalls(page)).toBe(before);
});
