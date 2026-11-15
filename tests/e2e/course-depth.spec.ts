import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
import { setTheme } from "./theme-helpers";
import { rendered } from "./rendered";

test("optional depth works with the keyboard and does not change the slide or start a quiz", async ({
  page,
  context,
}) => {
  await signIn(context, "primerSlides");
  const calls = await modelCalls(page);
  await page.goto("/play/rag/topics/0");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const note = rendered(page.locator("[data-course-depth]"));
  await expect(note).not.toHaveAttribute("open");
  const summary = note.locator("summary");
  await summary.focus();
  await summary.press("Enter");
  await expect(note).toHaveAttribute("open", "");
  await expect(page.getByLabel("Slide counter")).toHaveText("2 / 10");
  await expect(
    note.getByRole("link", { name: "The original RAG paper" }),
  ).toHaveAttribute("href", "https://arxiv.org/abs/2005.11401");
  await summary.press("Enter");
  await expect(note).not.toHaveAttribute("open");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Slide counter")).toHaveText("3 / 10");
  await expect(page.locator("[data-course-depth]")).not.toHaveAttribute("open");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-course-depth]")).not.toHaveAttribute("open");
  expect(await modelCalls(page)).toBe(calls);
});

test("worked examples and vector diagrams are readable in both themes at desktop and phone widths", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(context, "courseDiagrams");
  const calls = await modelCalls(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync("artifacts/rag-depth", { recursive: true });
  const cases = [
    { topic: 2, kind: "embedding-dimensions" },
    { topic: 2, kind: "vector-metric-example" },
    { topic: 1, kind: "pdf-text-or-ocr" },
    { topic: 1, kind: "chunk-strategy-options" },
    { topic: 1, kind: "chunk-boundary-case" },
    { topic: 2, kind: "vector-memory-budget" },
    { topic: 1, kind: "permission-revoke-race" },
    { topic: 3, kind: "retrieval-debug-case" },
    { topic: 5, kind: "context-budget-case" },
    { topic: 7, kind: "eval-case" },
  ];
  for (const theme of ["light", "dark"] as const) {
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const sample of cases) {
        await page.goto(`/play/rag/notebook?topic=${sample.topic}`);
        await expect(
          page.getByRole("heading", { name: "RAG notebook", exact: true }),
        ).toBeVisible();
        await setTheme(page, theme);
        const note = rendered(page.locator("[data-course-depth]")).filter({
          has: page.locator(`[data-course-diagram="${sample.kind}"]`),
        });
        await note.locator("summary").click();
        const diagram = note.getByRole("img");
        await diagram.scrollIntoViewIfNeeded();
        await expect(diagram).toHaveAttribute("aria-label", /.{30,}/u);
        const labels = await diagram
          .locator("svg:visible text")
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const rect = node.getBoundingClientRect();
              const svg = node.closest("svg");
              const bounds = svg?.getBoundingClientRect();
              return {
                font: getComputedStyle(node).fontFamily,
                size:
                  parseFloat(getComputedStyle(node).fontSize) *
                  (bounds && svg?.viewBox.baseVal.width
                    ? bounds.width / svg.viewBox.baseVal.width
                    : 0),
                within:
                  !!bounds &&
                  rect.left >= bounds.left - 1 &&
                  rect.right <= bounds.right + 1,
              };
            }),
          );
        expect(labels.length).toBeGreaterThan(2);
        for (const label of labels) {
          expect(label.font).toContain("Inter");
          expect(label.size).toBeGreaterThanOrEqual(13);
          expect(label.within).toBe(true);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await note.screenshot({
          path: `artifacts/rag-depth/${sample.kind}-${theme}-${width}.png`,
        });
      }
    }
  }
  for (let topic = 0; topic <= 9; topic++) {
    await page.goto(`/play/rag/notebook?topic=${topic}`);
    expect(
      await page.locator("[data-course-depth]").count(),
    ).toBeGreaterThanOrEqual(4);
  }
  expect(await modelCalls(page)).toBe(calls);
  expect(errors).toEqual([]);
});
