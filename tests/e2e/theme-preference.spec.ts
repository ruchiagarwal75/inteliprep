import { expect, test } from "@playwright/test";
import { setTheme } from "./theme-helpers";

test("light is the first-time default; the toggle is remembered before paint", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(
    page.getByRole("button", { name: "Switch to dark mode" }),
  ).toBeVisible();
  await setTheme(page, "dark");
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "mockmeai-theme")
      ?.value,
  ).toBe("dark");
  expect(
    await page.evaluate(() => localStorage.getItem("mockmeai:theme")),
  ).toBe("dark");
  const response = await page.reload();
  expect(await response?.text()).toMatch(/<html[^>]+data-theme="dark"/u);
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await setTheme(page, "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("a storage-only dark preference is applied before any visible frame", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("mockmeai:theme", "dark");
    const frames: string[] = [];
    Object.defineProperty(window, "themeFrames", { value: frames });
    const observe = () => {
      if (document.body)
        frames.push(document.documentElement.dataset.theme ?? "missing");
      if (frames.length < 10) requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "themeFrames").length))
    .toBeGreaterThanOrEqual(3);
  expect(
    await page.evaluate(() => Reflect.get(window, "themeFrames")),
  ).not.toContain("light");
  expect(
    await page.evaluate(() => Reflect.get(window, "themeFrames")),
  ).not.toContain("missing");
});

test("theme works if browser preference storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await setTheme(page, "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
