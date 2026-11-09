import { chromium, expect, test, type Page } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { writeFileSync } from "node:fs";
const accountId = "99999999-9999-4999-8999-999999999999";
async function savedBoard(page: Page) {
  return page.evaluate(async (userId) => {
    const id = location.pathname.split("/").at(-1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(`inteliprep:account:${userId}`);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<{
        whiteboard: {
          elements: {
            type: string;
            isDeleted: boolean;
            width: number;
            height: number;
            text?: string;
            originalText?: string;
          }[];
          appState: { zoom: { value: number } };
        };
      }>((resolve, reject) => {
        const r = db
          .transaction("interviews")
          .objectStore("interviews")
          .get(id ?? "");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  }, accountId);
}

for (const zoom of [1, 0.9, 1.1])
  test(`whiteboard preserves drag size at ${Math.round(zoom * 100)}% native browser zoom`, async ({}, info) => {
    test.setTimeout(120000);
    // Full Chromium and its own temporary profile allow real browser zoom, not CSS zoom or pinch scaling.
    const context = await chromium.launchPersistentContext(
      info.outputPath("zoom-profile"),
      {
        channel: "chromium",
        headless: true,
        ignoreHTTPSErrors: true,
        viewport: { width: 1280, height: 800 },
      },
    );
    try {
      const page = context.pages()[0];
      await page.goto("chrome://settings/appearance");
      await page.locator("select#zoomLevel").selectOption(String(zoom));
      await context.addInitScript(() => {
        localStorage.setItem("mockmeai:exclude-analytics", "1");
        localStorage.setItem("mockmeai:show-mascot", "false");
      });
      await signIn(context, "admin");
      await page.goto("http://localhost:3100/interview/new");
      await expect
        .poll(() => page.evaluate(() => devicePixelRatio))
        .toBeCloseTo(zoom, 2);
      await page
        .getByRole("button", { name: "Start interview", exact: true })
        .click();
      await page.waitForURL(/\/interview\/[a-f0-9-]+$/);
      const measurements = [];
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 1920, height: 1080 },
      ]) {
        await page.setViewportSize(viewport);
        const canvas = page.locator(".excalidraw canvas").first();
        await canvas.waitFor();
        const box = await canvas.boundingBox();
        if (!box) throw Error("Canvas missing");
        await page.mouse.click(box.x + 80, box.y + 130);
        await page.keyboard.press("Escape");
        await page.keyboard.press("ControlOrMeta+a");
        await page.keyboard.press("Backspace");
        await page.keyboard.press("r");
        await page.mouse.move(box.x + 120, box.y + 160);
        await page.mouse.down();
        await page.mouse.move(box.x + 420, box.y + 310, { steps: 25 });
        await page.mouse.up();
        await page.keyboard.press("Escape");
        await expect
          .poll(
            async () =>
              (await savedBoard(page)).whiteboard.elements.filter(
                (e) => !e.isDeleted && e.type === "rectangle",
              ).length,
          )
          .toBe(1);
        const shape = (await savedBoard(page)).whiteboard.elements.find(
          (e) => !e.isDeleted && e.type === "rectangle",
        );
        expect(shape?.width).toBeGreaterThanOrEqual(285);
        expect(shape?.width).toBeLessThanOrEqual(315);
        expect(shape?.height).toBeGreaterThanOrEqual(142.5);
        expect(shape?.height).toBeLessThanOrEqual(157.5);
        await page.mouse.dblclick(box.x + 270, box.y + 235);
        await page.keyboard.type("Redis cache");
        await page.keyboard.press("Escape");
        await expect
          .poll(
            async () =>
              (await savedBoard(page)).whiteboard.elements.find(
                (e) => !e.isDeleted && e.type === "text",
              )?.originalText,
          )
          .toBe("Redis cache");
        const text = (await savedBoard(page)).whiteboard.elements.find(
          (e) => !e.isDeleted && e.type === "text",
        );
        expect(text?.text?.split("\n").length).toBeLessThanOrEqual(2);
        measurements.push({
          viewport,
          zoom,
          shape: { width: shape?.width, height: shape?.height },
          label: text?.text,
        });
      }
      await info.attach("drag-measurements", {
        body: JSON.stringify(measurements, null, 2),
        contentType: "application/json",
      });
      writeFileSync(
        info.outputPath("drag-measurements.json"),
        JSON.stringify(measurements, null, 2),
      );
    } finally {
      await context.close();
    }
  });
