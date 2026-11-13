import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { captureCourse, modelCalls } from "./course-evidence";

test("a separate fresh account must see all slides once, then can revisit its quiz", async ({
  page,
  context,
}) => {
  await signIn(context, "courseFresh");
  const before = await modelCalls(page);
  for (let visit = 0; visit < 2; visit++) {
    await page.goto("/play/rag/topics/1");
    await expect(page.getByLabel("Slide counter")).toHaveText("1 / 13");
    await expect(
      page.getByRole("button", { name: "Start quiz", exact: true }),
    ).toHaveCount(0);
    const gated = await context.request.post("/api/play/round", {
      headers: { Origin: "http://localhost:3100" },
      data: {
        requestId: crypto.randomUUID(),
        topic: "rag-course",
        mode: "level",
        level: 1,
        timeZone: "UTC",
      },
    });
    expect(gated.status()).toBe(403);
  }
  for (let slide = 2; slide <= 13; slide++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByLabel("Slide counter")).toHaveText(`${slide} / 13`);
    if (slide < 13)
      await expect(
        page.getByRole("button", { name: "Start quiz", exact: true }),
      ).toHaveCount(0);
  }
  await page
    .getByRole("button", { name: "Start quiz", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Big chunks", exact: true }),
  ).toBeVisible();
  await page.goto("/play/rag/topics/1");
  await expect(page.getByLabel("Slide counter")).toHaveText("1 / 13");
  await expect(
    page.getByRole("button", { name: "Start quiz", exact: true }),
  ).toBeVisible();
  expect(await modelCalls(page)).toBe(before);
});

test("the HUD includes retired XP without resetting the streak", async ({
  page,
  context,
}) => {
  await signIn(context, "courseRestored");
  await page.goto("/play/rag");
  const hud = page.getByLabel("Your progress", { exact: true });
  await expect(hud.getByText("387 XP", { exact: true })).toBeVisible();
  await expect(hud.getByText("LV 3", { exact: true })).toBeVisible();
  await expect(
    hud.getByRole("img", { name: "2-day streak", exact: true }),
  ).toBeVisible();
  await captureCourse(page, "restored-xp-qa");
  await page.reload();
  await expect(hud.getByText("387 XP", { exact: true })).toBeVisible();
});
