import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { playView, fillPlayAnswer, dismissLevelUp } from "./play-helpers";
import { modelCalls } from "./course-evidence";
import { roundViewSchema, chestResultSchema } from "../../src/lib/play/public";
test.use({ actionTimeout: 15000 });
test("a fresh fixture passes all ten topics, reviews each mistake and opens all three chests once across reload", async ({
  page,
  context,
}) => {
  test.setTimeout(900000);
  await signIn(context, "content4Quiz");
  await page.setViewportSize({ width: 1440, height: 669 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync("artifacts/course-content-4", { recursive: true });
  let queue = Promise.resolve();
  await page.route("**/api/play/**", async (route) => {
    queue = queue.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 800)),
    );
    await queue;
    await route.continue();
  });
  await page.goto("/play/rag/notebook");
  for (const level of [7, 8, 9]) {
    const questions = page.locator(`[data-notebook-question^="T${level}-Q"]`);
    await expect(questions).toHaveCount(10);
    await expect(questions.first()).toContainText("Try it first");
    await expect(questions.first()).toHaveAttribute("data-answered", "false");
  }
  await page.goto("/play/rag?view=path");
  await expect(
    page.getByLabel("0 of 10 topics passed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("0 / 30 stars", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Topic 4: Re-ranking, locked", { exact: true }),
  ).toBeVisible();
  const levels = [
    { level: 0, slides: 10, total: 8 },
    { level: 1, slides: 13, total: 7 },
    ...[2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
      level,
      slides: level === 2 ? 13 : 12,
      total: 10,
    })),
  ];
  for (const { level, slides, total } of levels) {
    await page.goto(`/play/rag/topics/${level}`);
    for (let n = 1; n <= slides; n++) {
      await expect(page.getByLabel("Slide counter")).toHaveText(
        `${n} / ${slides}`,
      );
      if (n < slides)
        await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Start quiz", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("button", { name: "Check answer", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    for (let index = 0; index < total; index++) {
      const view = await playView(page),
        correct = index !== 0 && (total !== 10 || index !== 9);
      expect(view.question.ordinal).toBe(index);
      expect(view.question.total).toBe(total);
      await fillPlayAnswer(page, view, correct);
      const checked = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/submit") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      expect((await checked).status()).toBe(200);
      await dismissLevelUp(page);
      const result = page.getByLabel("Drill result", { exact: true });
      await expect(result).toHaveAttribute("data-correct", String(correct));
      await dismissLevelUp(page);
      if (index === 0) {
        const reference = view.question.courseSlide;
        if (reference === undefined) throw Error("Missing slide reference");
        await result
          .getByRole("button", { name: `See slide ${reference}`, exact: true })
          .click();
        const overlay = page.getByRole("dialog", {
          name: `Topic ${level} slides`,
          exact: true,
        });
        await expect(overlay.getByLabel("Slide counter")).toHaveText(
          `${reference} / ${slides}`,
        );
        await overlay
          .getByRole("button", { name: "Close slides", exact: true })
          .click();
      }
      if (index < total - 1) {
        const next = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/play/next") &&
            r.request().method() === "POST",
        );
        await result
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        const latest = roundViewSchema.parse(await (await next).json());
        await expect(
          page.getByRole("heading", {
            name: latest.question.title,
            exact: true,
          }),
        ).toBeVisible();
      } else
        await result
          .getByRole("button", { name: "Continue", exact: true })
          .click();
    }
    await expect(
      page.getByRole("heading", { name: "Topic passed", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${total === 10 ? 8 : total - 1} of ${total} correct`, {
        exact: true,
      }),
    ).toBeVisible();
    if (level >= 7)
      await page.screenshot({
        path: `artifacts/course-content-4/T${level}-passed.png`,
        fullPage: true,
      });
    await page.getByRole("link", { name: "Continue", exact: true }).click();
    await page
      .getByRole("link", { name: "Detailed path", exact: true })
      .click();
    await expect(
      page.getByLabel(`${level + 1} of 10 topics passed`, { exact: true }),
    ).toBeVisible();
    if (level < 9)
      await expect(
        page.getByRole("link", { name: new RegExp(`^Topic ${level + 1}:`) }),
      ).toBeVisible();
    if ([3, 6, 9].includes(level)) {
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/chest") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", {
          name: `Open chest after Topic ${level}`,
          exact: true,
        })
        .click();
      const prize = chestResultSchema.parse(await (await response).json());
      await page.reload();
      const node = page.locator(`[data-topic-level="${level}"]`);
      await expect(
        node.getByRole("button", {
          name: `Chest opened: +${prize.xp} XP`,
          exact: true,
        }),
      ).toBeDisabled();
      const replay = await page.request.post("/api/play/chest", {
        headers: { Origin: "http://localhost:3100" },
        data: { topic: "rag-course", afterLevel: level },
      });
      expect(replay.status()).toBe(200);
      expect(chestResultSchema.parse(await replay.json()).totals.points).toBe(
        prize.totals.points,
      );
      await node.screenshot({
        path: `artifacts/course-content-4/topic-${level}-chest.png`,
      });
    }
  }
  await expect(page.getByLabel("10 / 30 stars", { exact: true })).toBeVisible();
  await expect(
    page.getByText("10 of 10 cleared", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Soon", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/course-content-4/all-topics-cleared.png",
    fullPage: true,
  });
  await page.goto("/play/rag/notebook");
  for (const level of [7, 8, 9])
    await expect(
      page.locator(
        `[data-notebook-question^="T${level}-Q"][data-answered="true"]`,
      ),
    ).toHaveCount(10);
  expect(errors).toEqual([]);
  expect(await modelCalls(page)).toBe(before);
});
