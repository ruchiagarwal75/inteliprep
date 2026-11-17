import { expect, type Page, type BrowserContext } from "@playwright/test";
import { savedInterviewSchema } from "../../src/lib/saved-interview";
import { signIn } from "./fixture-auth";
import { MASCOT_PREFERENCE_KEY } from "../../src/components/mascot-preference";
import type { WhiteboardScene } from "../../src/lib/whiteboard-snapshot";

export function reloadComparableScene(scene: WhiteboardScene): unknown {
  // Native restore normalizes empty bindings to [] and JSON normalizes -0 to 0.
  // Still compare every coordinate, size, style, real binding, file and viewport.
  return JSON.parse(
    JSON.stringify({
      ...scene,
      elements: scene.elements.map((element) => ({
        ...element,
        boundElements: element.boundElements ?? [],
      })),
    }),
  );
}

export async function openWhiteboard(page: Page, context: BrowserContext) {
  await signIn(context, "layout");
  await context.addInitScript((key) => {
    localStorage.setItem(key, "false");
  }, MASCOT_PREFERENCE_KEY);
  await page.goto("/interview/new");
  const started = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/interview/start") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  expect((await started).status()).toBe(200);
  await page.waitForURL(/\/interview\/[a-f0-9-]+$/);
  await expect(page.locator(".excalidraw canvas").first()).toBeVisible();
}

export async function nativeBoard(page: Page) {
  const saved: unknown = await page.evaluate(async () => {
    const id = location.pathname.split("/").at(-1) ?? "";
    const database = (await indexedDB.databases()).find((entry) =>
      entry.name?.endsWith(":66666666-6666-4666-8666-666666666666"),
    );
    if (!database?.name) throw Error("Fixture interview database missing");
    const name = database.name;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
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
  return savedInterviewSchema.parse(saved).whiteboard;
}

export async function drawBox(
  page: Page,
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
) {
  const canvas = await page.locator(".excalidraw canvas").first().boundingBox();
  if (!canvas) throw Error("Whiteboard missing");
  await page.mouse.click(canvas.x + 30, canvas.y + 120);
  await page.keyboard.press("Escape");
  await page.keyboard.press("r");
  await page.mouse.move(canvas.x + x, canvas.y + y);
  await page.mouse.down();
  await page.mouse.move(canvas.x + x + width, canvas.y + y + height, {
    steps: 10,
  });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  if (label) {
    await page.mouse.dblclick(
      canvas.x + x + width / 2,
      canvas.y + y + height / 2,
    );
    await page.keyboard.insertText(label);
    await page.keyboard.press("Escape");
  }
}

export async function expectMeasuredCanvas(page: Page) {
  // The installed editor's native ResizeObserver owns its dimensions and offsets.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const editor = document.querySelector(".excalidraw");
        const rect = editor?.getBoundingClientRect();
        const canvas = editor?.querySelector("canvas")?.getBoundingClientRect();
        return Boolean(
          rect &&
          canvas &&
          Math.abs(rect.width - canvas.width) < 1 &&
          Math.abs(rect.height - canvas.height) < 1,
        );
      }),
    )
    .toBe(true);
  // Paint after ResizeObserver has updated the editor's native bounds.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}
