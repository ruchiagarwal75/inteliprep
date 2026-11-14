import { rendered } from "./rendered";
import { expect, test } from "@playwright/test";
import { modelCalls } from "./course-evidence";
import { bossView, bossShot } from "./boss-browser-helpers";
import { bossSessionId } from "./boss-fixture.mjs";
const states = [
  ["bossLocked", "locked", "Pass Topic 9 to unlock"],
  ["bossReady", "ready", "One free attempt"],
  ["bossProgress", "in_progress", "Resume boss"],
  ["bossUsed", "used", "Retry with Pro"],
  ["bossProRetry", "retry", "Retry boss"],
  ["bossDefeated", "defeated", "Boss defeated"],
] as const;
for (const theme of ["light", "dark"] as const)
  for (const width of [1440, 375]) {
    test(`all six boss states and confirmation: ${theme}, ${width}`, async ({
      page: statsPage,
      browser,
    }) => {
      test.setTimeout(150000);
      const errors: string[] = [];
      const before = await modelCalls(statsPage);
      for (const [account, state, text] of states) {
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await bossView(page, context, account, theme, width);
          const boss = rendered(page.locator("#rag-boss"));
          await expect(boss).toHaveAttribute("data-boss-state", state);
          await expect(boss.getByText(text, { exact: true })).toBeVisible();
          if (state === "defeated") {
            await expect(boss.locator("[data-boss-gate]")).toHaveAttribute(
              "data-boss-gate",
              "open",
            );
            await expect(boss.locator("[data-boss-pose]")).toHaveAttribute(
              "data-boss-pose",
              "defeated",
            );
            await expect(boss).toContainText("Score: 75%");
          }
          if (account === "bossProgress")
            await expect(
              boss.getByRole("link", { name: "Resume boss", exact: true }),
            ).toHaveAttribute("href", `/interview/${bossSessionId(account)}`);
          await bossShot(page, `${state}-${theme}-${width}`);
          if (state === "ready") {
            let starts = 0;
            page.on("request", (request) => {
              if (
                request.method() === "POST" &&
                request.url().endsWith("/api/interview/start")
              )
                starts++;
            });
            await boss
              .getByRole("button", { name: "Start boss", exact: true })
              .click();
            const dialog = page.getByRole("dialog", {
              name: "Ready for the RAG boss?",
            });
            await expect(dialog).toContainText("You get one free attempt.");
            await expect(dialog).toContainText(
              "45 minutes. No hints. Show me your design.",
            );
            await bossShot(page, `confirm-${theme}-${width}`);
            await dialog
              .getByRole("button", { name: "Not yet", exact: true })
              .click();
            expect(starts).toBe(0);
          }
        } finally {
          await context.close();
        }
      }
      expect(errors).toEqual([]);
      expect(await modelCalls(statsPage)).toBe(before);
    });
  }
