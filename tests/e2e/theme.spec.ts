import { expect, test } from "@playwright/test";
import { readGradingResponse } from "../../src/lib/read-grading-response";
import { signIn } from "./fixture-auth";
import {
  boardState,
  captureThemes,
  scoredResult,
  setTheme,
  whiteCorner,
} from "./theme-helpers";

test("both themes render Home, live interview and scored results; AI images stay white", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(context, "theme");
  // Freeze CSS gestures for reproducible screenshots, keeping the original mascot artwork visible.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Recent sessions", exact: true }),
  ).toBeVisible();
  await captureThemes(page, "home");
  await page.goto("/interview/new");
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await page.waitForURL(/\/interview\/[a-f0-9-]+$/);
  const canvas = page.locator(".excalidraw canvas").first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw Error("Canvas missing");
  await page.mouse.click(box.x + 80, box.y + 140);
  await page.keyboard.press("r");
  await page.mouse.move(box.x + 120, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 310, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await expect
    .poll(async () =>
      (await boardState(page)).whiteboard.elements.some(
        (e) => e.type === "rectangle",
      ),
    )
    .toBe(true);
  const before = (await boardState(page)).whiteboard;
  await setTheme(page, "light");
  await expect(page.locator(".excalidraw")).not.toHaveClass(/theme--dark/u);
  await setTheme(page, "dark");
  await expect(page.locator(".excalidraw")).toHaveClass(/theme--dark/u);
  const answer =
    "I would measure database query latency and CPU utilization under load, then compare the results before adding a cache.";
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(answer);
  const chatRequest = page.waitForRequest(
    (r) => r.url().endsWith("/api/chat") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await whiteCorner(page, (await chatRequest).postDataJSON().diagramImage);
  await expect(
    page.getByRole("button", { name: "End interview", exact: true }),
  ).toBeEnabled();
  const after = (await boardState(page)).whiteboard;
  expect(after.elements).toEqual(before.elements);
  expect(after.appState).toEqual(before.appState);
  await captureThemes(page, "interview");
  // Capture and inspect the real export used by the grader, then supply a public scored UI fixture.
  await setTheme(page, "dark");
  let finalImage: unknown;
  await page.route("**/api/interview/end", async (route) => {
    finalImage = route.request().postDataJSON().diagramImage;
    const response = await route.fetch();
    const result = await readGradingResponse(
      new Response(await response.text(), {
        status: response.status(),
        headers: response.headers(),
      }),
      () => {},
    );
    if (
      !result.body ||
      typeof result.body !== "object" ||
      !("scorecard" in result.body)
    )
      throw Error("Fixture grading failed");
    await route.fulfill({
      json: {
        ended: true,
        scorecard: scoredResult(new Date().toISOString(), answer),
      },
    });
  });
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page.waitForURL(/\/results$/);
  await expect(
    page.getByRole("heading", { name: "Interview scorecard", exact: true }),
  ).toBeVisible();
  await whiteCorner(page, finalImage);
  await page.getByText("Show evidence (1)", { exact: true }).first().click();
  await captureThemes(page, "results");
  await page.getByRole("tab", { name: "Final diagram", exact: true }).click();
  await expect(page.locator(".final-diagram .excalidraw")).toHaveClass(
    /theme--dark/u,
  );
  await setTheme(page, "light");
  await expect(page.locator(".final-diagram .excalidraw")).not.toHaveClass(
    /theme--dark/u,
  );
  expect(errors).toEqual([]);
});

test("admin surfaces and header controls follow the theme at desktop and phone widths", async ({
  page,
  context,
}) => {
  await signIn(context, "admin");
  for (const path of ["/admin", "/admin/feedback", "/admin/funnel"]) {
    await page.goto(path);
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"] as const) {
        await setTheme(page, theme);
        await expect(
          page.getByRole("heading", { name: "Private admin", exact: true }),
        ).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
      }
    }
  }
});
