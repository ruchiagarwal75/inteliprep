import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { roundViewSchema } from "../../src/lib/play/public";
const seen = new Set<string>();
export async function capturePlay(
  page: Page,
  name: string,
  folder = "play-beta",
) {
  mkdirSync(`artifacts/${folder}`, { recursive: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/${folder}/${name}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
export async function finishPlayRound(
  page: Page,
  capture = false,
  correct = true,
) {
  const session = new URL(page.url()).searchParams.get("session");
  if (!session) throw Error("No round session");
  for (let i = 0; i < 6; i++) {
    const response = await page.request.get(
      `/api/play/round?sessionId=${session}`,
    );
    expect(response.status()).toBe(200);
    const view = roundViewSchema.parse(await response.json()),
      q = view.question;
    await expect(
      page.getByRole("heading", { name: q.title, exact: true }),
    ).toBeVisible();
    const solution = await page.request.get(
      `https://127.0.0.1:4444/fixture/play-answer?attempt=${q.attemptId}`,
    );
    const answer = await solution.json();
    if (!correct) {
      if (answer.type === "math") answer.value = 999999999991;
      else if (answer.type === "spot_flaw")
        answer.option = String((Number(answer.option) + 1) % 4);
      else if (answer.type === "pick_probe") answer.text = "Unsure";
      else {
        answer.decision = "Unsure";
        answer.reason = "Unsure";
      }
    }

    if (view.status !== "graded") {
      if (q.type === "math")
        await page
          .getByRole("spinbutton", { name: "Value", exact: true })
          .fill(String(answer.value));
      if (q.type === "spot_flaw")
        await page.getByRole("radio").nth(Number(answer.option)).check();
      if (q.type === "pick_probe")
        await page
          .getByLabel("Your follow-up question", { exact: true })
          .fill(answer.text);
      if (q.type === "tradeoff") {
        await page
          .getByLabel("Your call", { exact: true })
          .fill(answer.decision);
        await page
          .getByLabel("Your reason, in 1 to 3 sentences", { exact: true })
          .fill(answer.reason);
      }
      const shot = capture && !seen.has(q.type);
      if (shot) await capturePlay(page, q.type + "-question");
      const checked = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/play/submit") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Check answer", exact: true })
        .click();
      expect((await checked).status()).toBe(200);
      if (!correct)
        await expect(
          page.getByRole("heading", { name: "Not quite", exact: true }),
        ).toBeVisible();
      else
        await expect(
          page
            .getByText("That calculation checks out.", { exact: true })
            .or(page.getByText("You found the flaw.", { exact: true }))
            .or(
              page.getByText(
                "Your answer names a mechanism and how to check it.",
                { exact: true },
              ),
            ),
        ).toBeVisible();
      if (shot) {
        await capturePlay(page, q.type + "-result");
        seen.add(q.type);
      }
    }
    const last = q.ordinal === q.total - 1;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    if (last) return;
    await expect(
      page.getByRole("button", { name: "Check answer", exact: true }),
    ).toBeVisible();
  }
  throw Error("Round did not finish");
}
