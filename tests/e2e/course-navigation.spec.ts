import { rendered } from "./rendered";
import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
test("slides move instantly while ordered saves and the quiz gate wait in the background", async ({
  page,
  context,
}) => {
  await signIn(context, "courseNavigation");
  const before = await modelCalls(page);
  const saved: number[] = [];
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let starts = 0;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/play/round") &&
      request.method() === "POST"
    )
      starts++;
  });
  await page.route("**/api/play/slides", async (route) => {
    const data: {
      index: number;
    } = route.request().postDataJSON();
    saved.push(data.index);
    if (data.index === 0) await pending;
    await route.continue();
  });
  try {
    await page.goto("/play/rag/topics/1");
    await expect(
      rendered(page.getByLabel("Slide counter")).filter({ visible: true }),
    ).toHaveText("1 / 13");
    await expect(
      page.getByRole("button", { name: "Start quiz", exact: true }),
    ).toHaveCount(0);
    for (let press = 0; press < 3; press++)
      await page.keyboard.press("ArrowRight");
    await expect(
      rendered(page.getByLabel("Slide counter")).filter({ visible: true }),
    ).toHaveText("4 / 13");
    expect(saved).toEqual([0]);
    await expect(
      page.getByRole("button", { name: "Next", exact: true }),
    ).toBeEnabled();
    await page.keyboard.press("ArrowLeft");
    await expect(
      rendered(page.getByLabel("Slide counter")).filter({ visible: true }),
    ).toHaveText("3 / 13");
    await page.keyboard.press("Enter");
    await expect(
      rendered(page.getByLabel("Slide counter")).filter({ visible: true }),
    ).toHaveText("4 / 13");
    await page.keyboard.press("ArrowRight");
    for (let slide = 6; slide <= 13; slide++)
      await page.keyboard.press("ArrowRight");
    await expect(
      rendered(page.getByLabel("Slide counter")).filter({ visible: true }),
    ).toHaveText("13 / 13");
    await page
      .getByRole("button", { name: "Start quiz", exact: true })
      .last()
      .click();
    expect(starts).toBe(0);
    release();
    await expect(
      page.getByRole("button", { name: "Check answer", exact: true }),
    ).toBeVisible();
    expect(starts).toBe(1);
    expect(saved).toEqual(Array.from({ length: 13 }, (_, index) => index));
    expect(await modelCalls(page)).toBe(before);
  } finally {
    release();
  }
});
