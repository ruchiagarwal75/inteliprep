import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
for (const theme of ["light", "dark"] as const)
  for (const width of [1440, 375])
    for (const reduce of [false, true]) {
      test(`world unlock ${theme} ${width} reduced=${reduce}`, async ({
        page,
        context,
      }) => {
        await signIn(context, "fixes4Unlock");
        await page.setViewportSize({
          width,
          height: width === 1440 ? 669 : 812,
        });
        await page.emulateMedia({
          reducedMotion: reduce ? "reduce" : "no-preference",
        });
        // The real toggle and reload set both persistence stores before the one-time scene.
        await page.goto("/play/rag");
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page
            .getByRole("button", {
              name: `Switch to ${theme} mode`,
              exact: true,
            })
            .click();
        const before = await modelCalls(page);
        await page.goto("/play/rag?primer=1&unlocked=1");
        const notice = page.getByRole("status", {
          name: "World unlocked",
          exact: true,
        });
        await expect(notice).toBeVisible();
        await expect(notice).toContainText(
          "9 topics open up. Next: Ingestion and chunking.",
        );
        const node = page.locator('[data-topic-level="1"] [data-course-node]');
        await expect
          .poll(async () =>
            node.evaluate((n) => {
              const r = n.getBoundingClientRect();
              return Math.abs(r.top + r.height / 2 - innerHeight / 2);
            }),
          )
          .toBeLessThan(2);
        const connector = page.locator("[data-primer-connector]").first();
        expect(
          await connector.evaluate((n) => getComputedStyle(n).stroke),
        ).toBe(
          await node.evaluate((n) => {
            const probe = document.createElement("i");
            probe.style.color = "var(--pixel-sprite-gold)";
            n.append(probe);
            const color = getComputedStyle(probe).color;
            probe.remove();
            return color;
          }),
        );
        const bubble = notice.getByText("Let's go deeper", { exact: true });
        await expect(bubble).toHaveCSS("border-top-width", "0px");
        expect(
          await bubble.evaluate((n) => getComputedStyle(n, "::before").content),
        ).not.toBe("none");
        await expect(node).toHaveCSS("animation-iteration-count", "1");
        if (reduce) {
          await expect(node).toHaveCSS("animation-name", "none");
          await expect(connector).toHaveCSS("animation-name", "none");
        } else {
          await expect(node).not.toHaveCSS("animation-name", "none");
        }
        mkdirSync("artifacts/course-fixes-4", { recursive: true });
        if (!reduce)
          await page.screenshot({
            path: `artifacts/course-fixes-4/unlock-${theme}-${width}.png`,
          });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (reduce) {
          await notice
            .getByRole("button", { name: "Later", exact: true })
            .click();
          await expect(notice).toHaveCount(0);
          await page.reload();
          await expect(notice).toHaveCount(0);
        } else {
          await notice
            .getByRole("link", { name: "Start Topic 1", exact: true })
            .click();
          await expect(page).toHaveURL(/\/play\/rag\/topics\/1$/);
          await expect(page.getByLabel("Slide counter")).toHaveText("1 / 13");
        }
        expect(await modelCalls(page)).toBe(before);
      });
    }
