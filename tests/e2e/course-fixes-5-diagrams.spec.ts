import { rendered } from "./rendered";
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { svgClearance } from "./svg-clearance";
const diagrams = [
  { kind: "safe-rollout", name: "T9-S11" },
  { kind: "degradation-steps", name: "T8-S9" },
  { kind: "sharded-index", name: "T8-S5" },
  { kind: "serving-paths", name: "T8-S2" },
];
test("polished diagram labels clear each other and shape borders in both layouts and themes", async ({
  page,
  context,
}) => {
  await signIn(context, "fixes4Learn");
  const before = await modelCalls(page),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  mkdirSync("artifacts/course-fixes-5", { recursive: true });
  for (const theme of ["light", "dark"] as const)
    for (const size of [
      { width: 1440, height: 669 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("/play/rag/notebook");
      if (
        (await rendered(page.locator("html")).getAttribute("data-theme")) !==
        theme
      ) {
        await page
          .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
          .click();
        await page.reload();
      }
      await page.evaluate(() => document.fonts.ready);
      for (const { kind, name } of diagrams) {
        await page.goto(
          `/play/rag/notebook?topic=${name.startsWith("T9") ? 9 : 8}`,
        );
        await page.evaluate(() => document.fonts.ready);
        const figure = rendered(
            page.locator(`[data-course-diagram="${kind}"]`),
          ),
          svg = figure.locator("svg:visible");
        await figure.scrollIntoViewIfNeeded();
        await expect(svg).toHaveAttribute(
          "data-diagram-layout",
          size.width === 1440 ? "landscape" : "portrait",
        );
        await expect(figure).toHaveAttribute("aria-label", /.{30,}/u);
        const failures = await svgClearance(svg);
        expect(failures, `${name} ${theme} ${size.width}`).toEqual([]);
        const bounds = await svg.boundingBox();
        if (!bounds) throw Error("Missing diagram");
        if (size.width === 1440) expect(bounds.height).toBeLessThanOrEqual(200);
        for (const text of await svg.locator("text").all()) {
          const b = await text.boundingBox();
          if (!b) throw Error("Missing text");
          expect(b.height).toBeGreaterThanOrEqual(13);
          expect(b.x).toBeGreaterThanOrEqual(bounds.x);
          expect(b.x + b.width).toBeLessThanOrEqual(bounds.x + bounds.width);
          expect(b.y).toBeGreaterThanOrEqual(bounds.y);
          expect(b.y + b.height).toBeLessThanOrEqual(bounds.y + bounds.height);
        }
        await figure.screenshot({
          path: `artifacts/course-fixes-5/${name}-${theme}-${size.width}.png`,
        });
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  expect(errors).toEqual([]);
  expect(await modelCalls(page)).toBe(before);
});
