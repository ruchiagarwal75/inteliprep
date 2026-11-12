import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { mkdirSync } from "node:fs";

test("vector slide diagrams use readable Inter labels in both themes and widths", async ({
  page,
  context,
}) => {
  await signIn(context, "courseDiagrams");
  mkdirSync("artifacts/rag-course", { recursive: true });
  for (const theme of ["light", "dark"]) {
    await context.addCookies([
      { name: "mockmeai-theme", value: theme, url: "http://localhost:3100" },
    ]);
    await page.addInitScript(
      (value) => localStorage.setItem("mockmeai:theme", value),
      theme,
    );
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/play/rag/topics/1");
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Use the normal toggle if a remembered preference from an earlier test differs.
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page
          .getByRole("button", {
            name:
              theme === "dark" ? "Switch to dark mode" : "Switch to light mode",
            exact: true,
          })
          .first()
          .click();
      let current = 1;
      for (const { number, kind } of [
        { number: 2, kind: "pipeline" },
        { number: 6, kind: "overlap" },
        { number: 8, kind: "split-table" },
      ]) {
        while (current < number) {
          await page.getByRole("button", { name: "Next", exact: true }).click();
          current++;
        }
        const diagram = page.locator(`[data-course-diagram="${kind}"]`);
        await expectReadableDiagram(diagram);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `artifacts/rag-course/vector-${kind}-${theme}-${width}.png`,
          fullPage: true,
        });
      }
      await page.goto("/play/rag/notebook");
      for (const kind of ["two-tower", "ann", "rrf"]) {
        const diagram = page.locator(`[data-course-diagram="${kind}"]`);
        await expectReadableDiagram(diagram);
        await diagram.screenshot({
          path: `artifacts/rag-course/vector-${kind}-${theme}-${width}.png`,
        });
      }
    }
  }
});

async function expectReadableDiagram(diagram: Locator) {
  await expect(diagram).toHaveAttribute("role", "img");
  await expect(diagram).toHaveAttribute("aria-label", /.{30,}/u);
  const visible = await diagram.locator("svg").evaluateAll((svgs) =>
    svgs
      .filter(
        (svg): svg is SVGSVGElement =>
          svg instanceof SVGSVGElement && svg.getBoundingClientRect().width > 0,
      )
      .map((svg) => ({
        ratio: svg.getBoundingClientRect().width / svg.viewBox.baseVal.width,
        labels: Array.from(svg.querySelectorAll("text"), (text) => ({
          font: getComputedStyle(text).fontFamily,
          size: parseFloat(getComputedStyle(text).fontSize),
        })),
      })),
  );
  expect(visible).toHaveLength(1);
  for (const label of visible[0].labels) {
    expect(label.font).toContain("Inter");
    expect(label.size * visible[0].ratio).toBeGreaterThanOrEqual(13);
  }
}
