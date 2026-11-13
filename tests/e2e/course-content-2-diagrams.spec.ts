import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
const illustrations = [
  { level: 2, total: 13, slides: [2, 3, 8, 9, 11] },
  { level: 3, total: 12, slides: [4, 5, 7, 9] },
];
test("every revised lesson and diagram fits both themes and target sizes", async ({
  page,
  context,
}) => {
  test.setTimeout(300000);
  await signIn(context, "content2Slides");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-content-2", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let queue = Promise.resolve();
  await page.route("**/api/play/**", async (route) => {
    queue = queue.then(
      () => new Promise<void>((resolve) => setTimeout(resolve, 500)),
    );
    await queue;
    await route.continue();
  });
  for (const theme of ["light", "dark"] as const)
    for (const size of [
      { width: 1440, height: 669 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      for (const { level, total, slides } of illustrations) {
        await page.goto(`/play/rag/topics/${level}`);
        if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
          await page
            .getByRole("button", {
              name: `Switch to ${theme} mode`,
              exact: true,
            })
            .click();
          await page.reload();
        }
        for (let number = 1; number <= total; number++) {
          await expect(page.getByLabel("Slide counter")).toHaveText(
            `${number} / ${total}`,
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          if (slides.includes(number)) {
            const figure = page.locator("[data-course-diagram]");
            await expect(figure).toHaveCount(1);
            await expect(figure).toHaveAttribute("role", "img");
            await expect(figure).toHaveAttribute("aria-label", /.{30,}/u);
            const svg = figure.locator("svg:visible");
            await expect(svg).toHaveCount(1);
            await expect(svg).toHaveAttribute(
              "data-diagram-layout",
              size.width === 1440 ? "landscape" : "portrait",
            );
            await figure.evaluate((node) =>
              node.scrollIntoView({ block: "center", behavior: "instant" }),
            );
            const bounds = await svg.boundingBox();
            if (!bounds) throw Error("Missing diagram");
            if (size.width === 1440) {
              expect(bounds.height).toBeLessThanOrEqual(200);
              expect(bounds.width).toBeGreaterThan(bounds.height);
            } else expect(bounds.height).toBeGreaterThan(bounds.width);
            await page.screenshot({
              path: `artifacts/course-content-2/T${level}-S${number}-${theme}-${size.width}.png`,
            });
            for (const text of await svg.locator("text").all()) {
              const metrics = await text.evaluate((node) => ({
                font: getComputedStyle(node).fontFamily,
                box: node.getBoundingClientRect().toJSON(),
              }));
              expect(metrics.font).toContain("Inter");
              expect(metrics.box.height).toBeGreaterThanOrEqual(13);
              expect(metrics.box.x).toBeGreaterThanOrEqual(bounds.x - 1);
              expect(metrics.box.x + metrics.box.width).toBeLessThanOrEqual(
                bounds.x + bounds.width + 1,
              );
            }
            if (level === 2 && number === 8)
              for (const [layer, count] of [
                [2, 3],
                [1, 6],
                [0, 12],
              ])
                await expect(
                  svg.locator(`[data-hnsw-layer="${layer}"] circle`),
                ).toHaveCount(count);
            if (level === 2 && number === 9) {
              await expect(svg.locator("[data-ivf-cluster]")).toHaveCount(6);
              await expect(svg.locator('[data-scanned="true"]')).toHaveCount(2);
            }
            if (level === 3 && number === 5)
              await expect(svg.locator("text")).toHaveText([
                "Keyword",
                "1 Doc A",
                "2 Doc C",
                "3 Doc B",
                "Dense",
                "1 Doc B",
                "2 Doc A",
                "RRF",
                "1 Doc A",
                "2 Doc B",
                "3 Doc C",
              ]);
          }
          if (number < total)
            await page
              .getByRole("button", { name: "Next", exact: true })
              .click();
        }
      }
    }
  expect(errors).toEqual([]);
  expect(await modelCalls(page)).toBe(before);
});
