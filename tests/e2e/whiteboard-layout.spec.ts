import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTheme } from "./theme-helpers";
import {
  drawBox,
  expectMeasuredCanvas,
  nativeBoard,
  openWhiteboard,
  reloadComparableScene,
} from "./whiteboard-layout-helpers";

const folder = "artifacts/whiteboard-workspace/after";
const sizes = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
];

test("board fills the desktop workspace and both themes keep phone tabs usable", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openWhiteboard(page, context);
  mkdirSync(folder, { recursive: true });
  const measurements = [];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      if (viewport.width < 900)
        await page.getByRole("tab", { name: "Board", exact: true }).click();
      await expectMeasuredCanvas(page);
      const board = await page.locator("#panel-board").boundingBox();
      const chat = await page.locator("#panel-chat").boundingBox();
      if (!board) throw Error("Board missing");
      const documentSize = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));
      expect(documentSize.width).toBeLessThanOrEqual(viewport.width);
      if (viewport.width >= 900) {
        if (!chat) throw Error("Chat missing");
        expect(board.width / (board.width + chat.width)).toBeGreaterThanOrEqual(
          0.7,
        );
        expect(board.width / (board.width + chat.width)).toBeLessThanOrEqual(
          0.75,
        );
        expect(chat.width).toBeGreaterThanOrEqual(340);
        expect(board.x).toBeLessThanOrEqual(24);
        expect(board.y + board.height).toBeGreaterThanOrEqual(
          viewport.height - 24,
        );
        expect(documentSize.height).toBeLessThanOrEqual(viewport.height);
        expect(board.height).toBeGreaterThan(viewport.height * 0.7);
        const note = page.locator(".interview-scoring-note");
        expect((await note.boundingBox())?.height).toBeLessThanOrEqual(32);
      } else {
        expect(board.height).toBeGreaterThanOrEqual(viewport.height * 0.65);
        await expect(
          page.getByRole("button", { name: "Focus whiteboard", exact: true }),
        ).toBeHidden();
      }
      const path = `${folder}/${viewport.width}x${viewport.height}-${theme}.png`;
      await page.screenshot({ path, fullPage: true, animations: "disabled" });
      measurements.push({ viewport, theme, board, chat, documentSize, path });
      if (viewport.width < 900) {
        await page.getByRole("tab", { name: "Chat", exact: true }).click();
        await expect(
          page.getByRole("textbox", { name: "Message", exact: true }),
        ).toBeVisible();
        await expect(page.locator("#panel-board")).toBeHidden();
      }
    }
  }
  writeFileSync(
    `${folder}/measurements.json`,
    JSON.stringify(measurements, null, 2),
  );
  expect(errors).toEqual([]);
});

test("ten labeled boxes and arrows keep their scene and viewport through Focus, resize and reload", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await openWhiteboard(page, context);
  const labels = [
    "API gateway",
    "Parser",
    "Embedder",
    "Vector DB",
    "Reranker",
    "Auth",
    "Doc store",
    "Redis cache",
    "Prompt",
    "LLM",
  ];
  for (const [i, label] of labels.entries())
    await drawBox(
      page,
      60 + (i % 5) * 175,
      150 + Math.floor(i / 5) * 170,
      140,
      70,
      label,
    );
  const canvas = await page.locator(".excalidraw canvas").first().boundingBox();
  if (!canvas) throw Error("Canvas missing");
  for (let i = 0; i < 9; i++) {
    const lastColumn = i === 4;
    const x = 60 + (i % 5) * 175;
    const y = 150 + Math.floor(i / 5) * 170;
    const arrow = page.getByRole("radio", { name: "Arrow", exact: true });
    await arrow.locator("..").click();
    await expect(arrow).toBeChecked();
    await page.mouse.move(
      canvas.x + (lastColumn ? 130 : x + 140),
      canvas.y + (lastColumn ? 220 : y + 35),
    );
    await page.mouse.down();
    await page.mouse.move(
      canvas.x + (lastColumn ? 130 : x + 175),
      canvas.y + (lastColumn ? 320 : y + 35),
      { steps: 8 },
    );
    await page.mouse.up();
    await page.keyboard.press("Escape");
    await expect
      .poll(
        async () =>
          (await nativeBoard(page)).elements.filter(
            (e) => !e.isDeleted && e.type === "arrow",
          ).length,
      )
      .toBe(i + 1);
  }
  await expect
    .poll(
      async () =>
        (await nativeBoard(page)).elements.filter(
          (e) => !e.isDeleted && e.type === "arrow",
        ).length,
    )
    .toBe(9);
  const before = await nativeBoard(page);
  for (const element of before.elements.filter((e) => !e.isDeleted)) {
    if (element.type === "rectangle") {
      expect(element.width).toBeGreaterThanOrEqual(133);
      expect(element.width).toBeLessThanOrEqual(147);
      expect(element.height).toBeGreaterThanOrEqual(66.5);
      expect(element.height).toBeLessThanOrEqual(73.5);
    }
    if (element.type === "text") {
      expect(element.text.split("\n").length).toBeLessThanOrEqual(2);
      if (element.containerId) {
        const container = before.elements.find(
          (e) => e.id === element.containerId,
        );
        if (!container) throw Error("Label container missing");
        expect(element.width).toBeLessThanOrEqual(container.width);
        expect(element.height).toBeLessThanOrEqual(container.height);
      }
    }
  }
  expect(
    before.elements.filter((e) => !e.isDeleted && e.type === "text"),
  ).toHaveLength(10);
  await page
    .getByRole("button", { name: "Focus whiteboard", exact: true })
    .click();
  await expect(page.locator("#panel-chat")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Show chat", exact: true }),
  ).toBeVisible();
  for (const size of [sizes[1], sizes[2], sizes[3], sizes[0]]) {
    await page.setViewportSize(size);
    if (size.width < 900)
      await page.getByRole("tab", { name: "Board", exact: true }).click();
    await expectMeasuredCanvas(page);
    expect(await nativeBoard(page)).toEqual(before);
  }
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    expect(await nativeBoard(page)).toEqual(before);
    await page.screenshot({
      path: `${folder}/focus-ten-boxes-${theme}.png`,
      animations: "disabled",
    });
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Exit whiteboard focus", exact: true }),
  ).toBeVisible();
  await expectMeasuredCanvas(page);
  expect(reloadComparableScene(await nativeBoard(page))).toEqual(
    reloadComparableScene(before),
  );
  await page.getByRole("button", { name: "Show chat", exact: true }).click();
  await expect(page.locator("#panel-chat")).toBeVisible();
  await expectMeasuredCanvas(page);
  expect(reloadComparableScene(await nativeBoard(page))).toEqual(
    reloadComparableScene(before),
  );
  await page.setViewportSize(sizes[1]);
  await expectMeasuredCanvas(page);
  await drawBox(page, 100, 530, 300, 150, "Redis cache");
  await expect
    .poll(
      async () =>
        (await nativeBoard(page)).elements.filter(
          (e) => !e.isDeleted && e.type === "rectangle",
        ).length,
    )
    .toBe(11);
  const added = (await nativeBoard(page)).elements.find(
    (e) =>
      e.type === "rectangle" && !before.elements.some((old) => old.id === e.id),
  );
  expect(added?.width).toBeGreaterThanOrEqual(285);
  expect(added?.width).toBeLessThanOrEqual(315);
  expect(added?.height).toBeGreaterThanOrEqual(142.5);
  expect(added?.height).toBeLessThanOrEqual(157.5);
});

test("Focus keeps chat mounted, restores drafts, and flags a completed fixture reply", async ({
  page,
  context,
}) => {
  await openWhiteboard(page, context);
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/chat", async (route) => {
    await pending;
    await route.continue();
  });
  const request = page.waitForRequest("**/api/chat");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(
      "I would measure query latency and traffic before changing capacity.",
    );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await request;
  await page
    .getByRole("button", { name: "Focus whiteboard", exact: true })
    .click();
  release();
  await expect(
    page.getByRole("button", {
      name: "Show chat, new interviewer reply",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator("#panel-chat")).toHaveCount(1);
  await page.keyboard.press("Alt+Shift+F");
  await expect(page.locator("#panel-chat")).toBeVisible();
  const message = page.getByRole("textbox", { name: "Message", exact: true });
  await message.fill("Draft to keep while drawing");
  await message.press("Alt+Shift+F");
  await expect(page.locator("#panel-chat")).toBeVisible();
  await page
    .getByRole("button", { name: "Focus whiteboard", exact: true })
    .click();
  await expect(page.getByText("New reply", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("timer")).toBeVisible();
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep going", exact: true }).click();
  await page.getByRole("button", { name: "Show chat", exact: true }).click();
  await expect(message).toHaveValue("Draft to keep while drawing");
});
