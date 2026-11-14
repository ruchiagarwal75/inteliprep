import { roundViewSchema } from "../../src/lib/play/public";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { playView, fillPlayAnswer, dismissLevelUp } from "./play-helpers";

test("new players learn Topic 0, pass its eight-question quiz and unlock the world without AI", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await signIn(context, "primerFresh");
  await page.setViewportSize({ width: 1440, height: 669 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let transport = Promise.resolve();
  await page.route("**/api/play/**", async (route) => {
    transport = transport.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 800)),
    );
    await transport;
    await route.continue();
  });
  const before = await modelCalls(page);
  mkdirSync("artifacts/rag-primer", { recursive: true });
  await page.goto("/play/rag?primer=1&unlocked=1");
  await expect(
    page.getByRole("status", { name: "World unlocked", exact: true }),
  ).toHaveCount(0);
  const topics = page
    .getByRole("list", { name: "RAG course topics" })
    .locator(":scope > li");
  await expect(topics).toHaveCount(10);
  await expect(topics.first()).toContainText("RAG basics");
  await expect(topics.first()).toContainText("About 8 min");
  await expect(topics.nth(1)).toContainText("Pass Topic 0 to unlock");
  await page.screenshot({ path: "artifacts/rag-primer/path-first-1440.png" });
  await page.goto("/play/rag/topics/1");
  await expect(
    page.getByRole("heading", { name: "Topic locked", exact: true }),
  ).toBeVisible();
  await page.goto("/play/rag/topics/0");
  for (let slide = 1; slide <= 10; slide++) {
    await expect(
      page.getByLabel("Slide counter").filter({ visible: true }),
    ).toHaveText(`${slide} / 10`);
    const body = page.getByRole("region", { name: "Slide content" });
    expect(
      await body.evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
    ).toBe(true);
    if (slide < 10)
      await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Start quiz", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Why RAG", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.screenshot({
    path: "artifacts/rag-primer/quiz-1440.png",
    fullPage: true,
  });
  for (let index = 0; index < 8; index++) {
    const view = await playView(page);
    expect(view.question.total).toBe(8);
    expect(view.question.ordinal).toBe(index);
    expect(JSON.stringify(view.question)).not.toMatch(
      /correctIndex|keyIdea|ifWrong/,
    );
    await fillPlayAnswer(page, view, index !== 5 && index !== 7);
    const checked = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/play/submit") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    expect((await checked).status()).toBe(200);
    await dismissLevelUp(page);
    const result = page.getByLabel("Drill result", { exact: true });
    await expect(result).toBeVisible();
    await dismissLevelUp(page);
    if (index < 7) {
      const advanced = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/play/next") &&
          response.request().method() === "POST",
      );
      await result
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      const response = await advanced;
      expect(response.status()).toBe(200);
      const next = roundViewSchema.parse(await response.json());
      expect(next.question.ordinal).toBe(index + 1);
      await expect(
        page.getByRole("heading", { name: next.question.title, exact: true }),
      ).toBeVisible();
    } else
      await result
        .getByRole("button", { name: "Continue", exact: true })
        .click();
  }
  await expect(
    page.getByRole("heading", { name: "Topic passed", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("6 of 8 correct", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "RAG Rookie", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("105 XP earned", { exact: true })).toHaveText(
    "105 XP",
  );
  await page.screenshot({
    path: "artifacts/rag-primer/result-1440.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  const unlock = page.getByRole("status", {
    name: "World unlocked",
    exact: true,
  });
  await expect(unlock).toBeVisible();
  await expect(unlock).toContainText("Let's go deeper");
  const connector = page.locator("[data-primer-connector]").first();
  await expect(connector).not.toHaveCSS("animation-name", "none");
  const initial = await connector.evaluate((node) =>
    parseFloat(getComputedStyle(node).strokeDashoffset),
  );
  await expect
    .poll(() =>
      connector.evaluate((node) =>
        parseFloat(getComputedStyle(node).strokeDashoffset),
      ),
    )
    .toBeLessThan(initial);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-primer-connector]").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const heading = await unlock
    .getByRole("heading", { name: "World unlocked", exact: true })
    .boundingBox();
  const bubble = await unlock
    .getByText("Let's go deeper", { exact: true })
    .boundingBox();
  if (!heading || !bubble)
    throw Error("Missing unlock heading or speech bubble");
  expect(bubble.y).toBeGreaterThanOrEqual(heading.y + heading.height + 8);
  await expect(
    page.locator('[aria-label="Practice guide"]:visible'),
  ).toHaveCount(1);
  await page.screenshot({
    path: "artifacts/rag-primer/world-unlocked-1440.png",
  });
  await unlock.getByRole("button", { name: "Later", exact: true }).click();
  await expect(unlock).toHaveCount(0);
  await expect(
    topics.nth(1).getByRole("link", { name: "Learn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("1 / 30 stars", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expect(unlock).toHaveCount(0);
  await page.goto("/play/rag/topics/1");
  await expect(
    page.getByLabel("Slide counter").filter({ visible: true }),
  ).toHaveText("1 / 13");
  expect(await modelCalls(page)).toBe(before);
  expect(errors).toEqual([]);
});

test("a returning player can keep Topic 1 and take the optional primer later", async ({
  page,
  context,
}) => {
  await signIn(context, "primerLegacy");
  await page.goto("/play/rag");
  const topics = page
    .getByRole("list", { name: "RAG course topics" })
    .locator(":scope > li");
  await expect(topics.first()).toContainText("Optional");
  await expect(topics.nth(1)).toHaveAttribute("aria-current", "step");
  await page.goto("/play/rag/topics/1");
  await expect(
    page.getByLabel("Slide counter").filter({ visible: true }),
  ).toHaveText("1 / 13");
  await page.goto("/play/rag/topics/0");
  await expect(
    page.getByLabel("Slide counter").filter({ visible: true }),
  ).toHaveText("1 / 10");
});
