import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { capturePlay, finishPlayRound, openPlayLevel } from "./play-helpers";
test("Play placement, four drill types, rewards, readiness and Mock prompt use only stubs", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(context, "play");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/play");
  await expect(
    page.getByRole("heading", {
      name: "Level up for the AI engineer interview.",
    }),
  ).toBeVisible();
  await capturePlay(page, "topic-map");
  await page.getByRole("link", { name: "Play RAG", exact: true }).click();
  await page.getByRole("button", { name: "Skip ahead", exact: true }).click();
  await page.waitForURL(/\/play\/rag\/drill\?session=/);
  await finishPlayRound(page, true);
  await expect(
    page.getByRole("heading", { name: "Placement complete", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Levels cleared:/)).toHaveCount(0);
  await page.getByRole("link", { name: "Back to levels", exact: true }).click();
  await expect(
    page.getByLabel(/^Level 1: .*passed$/u, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(/^Level 2: .*passed$/u, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel(/^Level 3: .*passed$/u, { exact: true }),
  ).toBeVisible();
  await openPlayLevel(page, 1);
  await page.waitForURL(/\/play\/rag\/drill\?session=/);
  await finishPlayRound(page, true);
  await expect(
    page.getByRole("heading", { name: "Level passed", exact: true }),
  ).toBeVisible();
  await capturePlay(page, "level-passed");
  await page.getByRole("link", { name: "Back to levels", exact: true }).click();
  await openPlayLevel(page, 4);
  await page.waitForURL(/\/play\/rag\/drill\?session=/);
  await finishPlayRound(page, true);
  await expect(
    page.getByRole("heading", { name: "Level passed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("You're ready to test this for real.", { exact: false }),
  ).toBeVisible();
  await capturePlay(page, "rag-mock-prompt");
  await page.getByRole("link", { name: "Open Progress", exact: true }).click();
  await expect(page.getByText("Practice ready", { exact: true })).toBeVisible();
  await expect(page.getByLabel("1-day streak", { exact: true })).toBeVisible();
  await expect(page.getByText(/^[\d,]+ XP$/u)).toBeVisible();
  await capturePlay(page, "progress");
  await page.reload();
  await expect(page.getByText("Practice ready", { exact: true })).toBeVisible();
  const session = new URL(page.url()).searchParams.get("session");
  expect(session).toBeNull();
  const foreign = await browser.newContext();
  try {
    await signIn(foreign, "theme");
    // Owner-scoped endpoints do not reveal another account's round.
    const rounds = await context.request.post("/api/play/round", {
      headers: { Origin: "http://localhost:3100" },
      data: {
        requestId: crypto.randomUUID(),
        topic: "rag",
        mode: "level",
        level: 1,
        timeZone: "UTC",
      },
    });
    const owned = await rounds.json();
    expect(rounds.status()).toBe(200);
    expect(
      (
        await foreign.request.get(
          `/api/play/round?sessionId=${owned.sessionId}`,
        )
      ).status(),
    ).toBe(404);
  } finally {
    await foreign.close();
  }
  const signedOut = await browser.newContext();
  try {
    expect(
      (
        await signedOut.request.get(
          "/api/play/round?sessionId=" + crypto.randomUUID(),
        )
      ).status(),
    ).toBe(401);
  } finally {
    await signedOut.close();
  }
  expect(errors).toEqual([]);
});
