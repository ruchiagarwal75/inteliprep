import { rendered } from "./rendered";
import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { roundViewSchema } from "../../src/lib/play/public";
import type { RoundView } from "../../src/lib/play/public";
const seen = new Set<string>();
export async function capturePlay(
  page: Page,
  name: string,
  folder = "play-beta",
  fullPage = true,
) {
  mkdirSync(`artifacts/${folder}`, { recursive: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/${folder}/${name}-${width}.png`,
      fullPage,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
export async function dismissLevelUp(page: Page) {
  const modal = rendered(page.locator("dialog")).filter({
    has: page.getByRole("heading", { name: "Level up!", exact: true }),
  });
  if (await modal.count()) {
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(modal).toHaveCount(0);
  }
}
export async function openPlayLevel(page: Page, level: number) {
  await page.goto(`/play/rag/topics/${level}`);
  for (let i = 0; i < 100; i++) {
    const quiz = page.getByRole("button", { name: "Start quiz", exact: true });
    if (await quiz.count()) {
      await quiz.first().click();
      break;
    }
    // Next can retain a hidden streamed tree while the visible lesson is ready.
    const counter = rendered(page.getByLabel("Slide counter")).filter({
      visible: true,
    });
    await expect(counter).toHaveCount(1);
    const previous = await counter.textContent();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(counter).not.toHaveText(previous ?? "");
  }
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible({ timeout: 30000 });
}
export async function playView(page: Page) {
  const session = new URL(page.url()).searchParams.get("session");
  if (!session) throw Error("No round");
  const response = await page.request.get(
    `/api/play/round?sessionId=${session}`,
  );
  expect(response.status()).toBe(200);
  return roundViewSchema.parse(await response.json());
}
export async function fillPlayAnswer(
  page: Page,
  view: RoundView,
  correct = true,
) {
  const q = view.question;
  const response = await page.request.get(
    `https://127.0.0.1:4444/fixture/play-answer?attempt=${q.attemptId}`,
  );
  const answer = await response.json();
  if (!correct) {
    if (q.type === "math") answer.value = 999999999991;
    else if (q.type === "spot_flaw")
      answer.option = String((Number(answer.option) + 1) % 4);
    else if (q.type === "pick_probe") answer.text = "Unsure";
    else {
      answer.decision = "Unsure";
      answer.reason = "Unsure";
    }
  }
  if (q.type === "math")
    await page
      .getByRole("spinbutton", { name: "Value", exact: true })
      .fill(String(answer.value));
  else if (q.type === "spot_flaw")
    await page.getByRole("radio").nth(Number(answer.option)).check();
  else if (q.type === "pick_probe")
    await rendered(
      page.getByLabel("Your follow-up question", { exact: true }),
    ).fill(answer.text);
  else {
    await rendered(page.getByLabel("Your call", { exact: true })).fill(
      answer.decision,
    );
    await rendered(
      page.getByLabel("Your reason, in 1 to 3 sentences", { exact: true }),
    ).fill(answer.reason);
  }
  return answer;
}
export async function finishPlayRound(
  page: Page,
  capture = false,
  correct = true,
) {
  for (let i = 0; i < 10; i++) {
    const view = await playView(page),
      q = view.question;
    await expect(
      page.getByRole("heading", { name: q.title, exact: true }),
    ).toBeVisible();
    if (view.status !== "graded") {
      await fillPlayAnswer(page, view, correct);
      const shot = capture && !seen.has(q.type);
      if (shot)
        await capturePlay(page, q.type + "-question", "play-beta", false);
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
      await expect(
        rendered(page.getByLabel("Drill result", { exact: true })),
      ).toHaveAttribute("data-correct", String(correct));
      await dismissLevelUp(page);
      if (shot) {
        await capturePlay(page, q.type + "-result", "play-beta", false);
        seen.add(q.type);
      }
    }
    await dismissLevelUp(page);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    if (q.ordinal === q.total - 1) return;
    await expect(
      page.getByRole("button", { name: "Check answer", exact: true }),
    ).toBeVisible();
  }
  throw Error("Round did not finish");
}
