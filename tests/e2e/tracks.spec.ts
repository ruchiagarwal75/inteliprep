import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { z } from "zod";
import { signIn } from "./fixture-auth";
test("track choices filter the picker, survive reload, and fit a phone", async ({
  page,
  context,
}) => {
  await signIn(context, "genai");
  await page.addInitScript(() =>
    localStorage.setItem("mockmeai:show-mascot", "false"),
  );
  let modelTurns = 0;
  page.on("request", (request) => {
    if (
      ["/api/chat", "/api/interview/start", "/api/interview/end"].some((path) =>
        request.url().endsWith(path),
      )
    )
      modelTurns++;
  });
  await page.goto("/interview/new");
  const core = page.getByRole("radio", { name: "System design", exact: true });
  const ai = page.getByRole("radio", {
    name: "AI / ML system design",
    exact: true,
  });
  await expect(core).toBeChecked();
  const catalog = z
    .object({
      problems: z.array(
        z.object({ problemId: z.string(), track: z.enum(["core", "genai"]) }),
      ),
    })
    .parse(await (await page.request.get("/api/problems")).json()).problems;
  mkdirSync("artifacts/ml-track", { recursive: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [track, control] of [
      ["core", core],
      ["genai", ai],
    ] as const) {
      await control.check();
      const select = page.getByRole("combobox", {
        name: "Problem",
        exact: true,
      });
      await expect(select.locator("optgroup")).toHaveCount(0);
      expect(
        await select
          .locator("option")
          .evaluateAll((options) =>
            options.map((option) => option.getAttribute("value")),
          ),
      ).toEqual(
        catalog.filter((p) => p.track === track).map((p) => p.problemId),
      );
      if (track === "genai") await select.selectOption("video-recommendations");
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `artifacts/ml-track/${track}-${width}.png`,
        fullPage: true,
      });
    }
  }
  for (const id of ["video-recommendations", "ad-click-prediction"]) {
    await page
      .getByRole("combobox", { name: "Problem", exact: true })
      .selectOption(id);
    await expect(
      page
        .getByRole("region", { name: "Problem brief", exact: true })
        .getByLabel("AI / ML system design", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".stage-label")).toHaveText([
      "Clarify and frame the problem",
      "Draw and explain",
      "Data, features and model",
      "Serving, scale and monitoring",
      "Tradeoffs and wrap-up",
    ]);
  }
  await page.reload();
  await expect(ai).toBeChecked();
  await ai.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(core).toBeChecked();
  await page.reload();
  await expect(core).toBeChecked();
  expect(modelTurns).toBe(0);
});
