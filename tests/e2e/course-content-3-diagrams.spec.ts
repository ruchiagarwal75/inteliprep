import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
const illustrations = [
  { level: 4, total: 12, slides: [2, 3, 6, 8] },
  { level: 5, total: 12, slides: [1, 3, 9, 10] },
  { level: 6, total: 12, slides: [2, 5, 6, 8] },
];
test("all thirty-six new slides and twelve diagrams fit both themes and target sizes", async ({
  page,
  context,
}) => {
  test.setTimeout(480000);
  await signIn(context, "content3Slides");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const before = await modelCalls(page);
  mkdirSync("artifacts/course-content-3", { recursive: true });
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
  let visited = 0;
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
          visited++;
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
              path: `artifacts/course-content-3/T${level}-S${number}-${theme}-${size.width}.png`,
            });
            await page.evaluate(() => document.fonts.ready);
            for (const text of await svg.locator("text").all()) {
              const metrics = await text.evaluate((node) => ({
                font: getComputedStyle(node).fontFamily,
                box: node.getBoundingClientRect().toJSON(),
              }));
              expect(metrics.font).toContain("Inter");
              expect(metrics.box.height).toBeGreaterThanOrEqual(13);
              expect(metrics.box.x).toBeGreaterThanOrEqual(bounds.x - 1);
              expect(metrics.box.y).toBeGreaterThanOrEqual(bounds.y - 1);
              expect(metrics.box.y + metrics.box.height).toBeLessThanOrEqual(
                bounds.y + bounds.height + 1,
              );
              expect(metrics.box.x + metrics.box.width).toBeLessThanOrEqual(
                bounds.x + bounds.width + 1,
              );
            }
            await figure.screenshot({
              path: `artifacts/course-content-3/T${level}-S${number}-${theme}-${size.width}-diagram.png`,
            });
            const curve = svg.locator("[data-lesson-curve]");
            if (await curve.count()) {
              const overlaps = await curve.evaluate((node) => {
                if (!(node instanceof SVGPathElement))
                  throw Error("Missing curve");
                const label =
                  node.ownerSVGElement?.querySelector("[data-curve-label]");
                const matrix = node.getScreenCTM();
                if (!label || !matrix) throw Error("Missing curve label");
                const box = label.getBoundingClientRect(),
                  length = node.getTotalLength();
                return Array.from({ length: 301 }, (_, i) => {
                  const local = node.getPointAtLength((length * i) / 300);
                  const point = new DOMPoint(local.x, local.y).matrixTransform(
                    matrix,
                  );
                  return (
                    point.x >= box.left &&
                    point.x <= box.right &&
                    point.y >= box.top &&
                    point.y <= box.bottom
                  );
                }).some(Boolean);
              });
              expect(overlaps).toBe(false);
            }
          }
          if (number < total)
            await page
              .getByRole("button", { name: "Next", exact: true })
              .click();
        }
      }
    }
  expect(visited).toBe(144);
  expect(errors).toEqual([]);
  expect(await modelCalls(page)).toBe(before);
});
