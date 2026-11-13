import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { scorecardSchema } from "../../src/lib/scorecard";
export const screenshotFolder = "artifacts/light-theme";
export async function setTheme(page: Page, theme: "light" | "dark") {
  if ((await page.locator("html").getAttribute("data-theme")) !== theme)
    await page
      .getByRole("button", { name: `Switch to ${theme} mode`, exact: true })
      .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}
export async function captureThemes(
  page: Page,
  name: string,
  folder = screenshotFolder,
) {
  mkdirSync(folder, { recursive: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `${folder}/${name}-${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 669 });
}
export async function whiteCorner(page: Page, image: unknown) {
  expect(typeof image).toBe("string");
  if (typeof image !== "string") throw Error("Diagram PNG missing");
  expect(
    await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) throw Error("Canvas missing");
      context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(1, 1, 1, 1).data);
    }, image),
  ).toEqual([255, 255, 255, 255]);
}
export async function boardState(page: Page) {
  return page.evaluate(async () => {
    const id = location.pathname.split("/").at(-1) ?? "";
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        "inteliprep:account:dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      );
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{
        whiteboard: {
          elements: {
            id: string;
            type: string;
            width: number;
            height: number;
          }[];
          appState: {
            scrollX?: number;
            scrollY?: number;
            zoom?: { value: number };
            viewBackgroundColor: string;
          };
        };
      }>((resolve, reject) => {
        const request = db
          .transaction("interviews")
          .objectStore("interviews")
          .get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}
// Public UI fixture only. The real end/freeze requests still run against isolated stub infrastructure.
export function scoredResult(endedAt: string, quote: string) {
  return scorecardSchema.parse({
    problemId: "single-server-scaling",
    level: "mid",
    problemTitle: "Scale a single server",
    endedAt,
    summary:
      "You identified the database bottleneck and explained how to check whether the change improves latency.",
    signal: "yes",
    session: {
      startedAt: new Date(Date.parse(endedAt) - 1_500_000).toISOString(),
      elapsedSeconds: 1500,
      allowedSeconds: 2700,
      limited: false,
      note: "This feedback is grounded in your design and explanation.",
    },
    areas: [
      "Requirements and goals",
      "Find the bottleneck",
      "Core design",
      "Scaling and reliability",
      "Tradeoffs",
    ].map((area, i) => ({
      area,
      score: i === 3 ? 2 : 3,
      rationale:
        "You gave a concrete mechanism and described how you would verify it.",
      evidence: [{ kind: "message", messageIndex: 1, quote }],
    })),
    strengths: [
      {
        text: "You use measurements to guide the design.",
        evidence: [{ kind: "message", messageIndex: 1, quote }],
      },
    ],
    gaps: [
      {
        text: "Explore what happens to cached values during a database failure.",
        evidence: [{ kind: "message", messageIndex: 1, quote }],
      },
    ],
    nextPractice: {
      problemId: "url-shortener",
      title: "Design a URL shortener",
      focus: "Practice a read-heavy design and its failure paths.",
    },
  });
}
