import { rendered } from "./rendered";
import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { capturePixel } from "./capture-pixel";
test("the five original pixel poses use exact crisp grids, local fonts and safe motion", async ({
  page,
  context,
}) => {
  await signIn(context, "playThinking");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const foreignFonts: string[] = [];
  page.on("request", (req) => {
    if (
      req.resourceType() === "font" &&
      !req.url().startsWith("http://localhost:3100/")
    )
      foreignFonts.push(req.url());
  });
  await page.goto("/play/sprites");
  await page.evaluate(async () => document.fonts.ready);
  for (const pose of ["idle", "cheer", "encourage", "thinking", "celebrate"]) {
    const sprite = rendered(page.locator(`[data-pixel-pose="${pose}"]`));
    await expect(sprite).toBeVisible();
    await expect(sprite.locator("svg").first()).toHaveAttribute(
      "shape-rendering",
      "crispEdges",
    );
  }
  await capturePixel(page, "poses");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await rendered(
    page.locator("[data-pixel-pose] *"),
  ).evaluateAll((rows) =>
    rows.map((row) => getComputedStyle(row).animationName),
  );
  expect(animations.every((name) => name === "none")).toBe(true);
  const caption = rendered(page.getByText("Thinking", { exact: true }));
  await expect(caption).toHaveCSS("font-family", /Inter/);
  expect(foreignFonts).toEqual([]);
  expect(errors).toEqual([]);
});
