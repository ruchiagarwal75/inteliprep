import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { setTheme } from "./theme-helpers";
import { mkdirSync } from "node:fs";
async function checkPalette(page: Page) {
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement),
      body = getComputedStyle(document.body),
      main = document.querySelector("main"),
      probe = document.createElement("i");
    document.body.append(probe);
    const resolved = (variable: string) => {
      probe.style.color = `var(${variable})`;
      return getComputedStyle(probe).color;
    };
    const result = {
      background: body.backgroundColor,
      expectedBackground: resolved("--pixel-sky"),
      foreground: body.color,
      expectedForeground: resolved("--pixel-text"),
      main: main ? getComputedStyle(main).backgroundColor : undefined,
      exportColor: resolved("--diagram-export-background"),
      cards: root.getPropertyValue("--surface").trim(),
      playCards: root.getPropertyValue("--pixel-card").trim(),
      accent: root.getPropertyValue("--accent").trim(),
      playAccent: root.getPropertyValue("--pixel-violet").trim(),
    };
    probe.remove();
    return result;
  });
  expect(colors.background).toBe(colors.expectedBackground);
  expect(colors.foreground).toBe(colors.expectedForeground);
  expect(colors.cards).toBe(colors.playCards);
  expect(colors.accent).toBe(colors.playAccent);
  expect(colors.exportColor).toBe("rgb(255, 255, 255)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
for (const account of ["public", "invited", "admin"] as const)
  test(`${account} pages share the Play palette in both themes`, async ({
    page,
    context,
  }) => {
    test.setTimeout(180000);
    if (account !== "public") await signIn(context, account);
    await page.emulateMedia({ reducedMotion: "reduce" });
    mkdirSync("artifacts/course-fixes-5/palette", { recursive: true });
    const paths =
      account === "public"
        ? ["/", "/sign-in", "/privacy", "/terms"]
        : account === "admin"
          ? ["/admin", "/admin/feedback", "/admin/funnel"]
          : [
              "/play",
              "/play/rag",
              "/mock",
              "/mock/history",
              "/interview/new",
              "/progress",
            ];
    for (const path of paths)
      for (const width of [1440, 375]) {
        await page.setViewportSize({
          width,
          height: width === 1440 ? 669 : 812,
        });
        await page.goto(path);
        for (const theme of ["light", "dark"] as const) {
          await setTheme(page, theme);
          await page.evaluate(() => document.fonts.ready);
          await checkPalette(page);
          await page.screenshot({
            path: `artifacts/course-fixes-5/palette/${account}-${path.replaceAll("/", "_") || "home"}-${theme}-${width}.png`,
            fullPage: true,
          });
        }
      }
  });
