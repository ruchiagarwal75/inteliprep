import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";

test("GenAI group preserves private facts and runs the normal interview flow", async ({
  page,
  context,
}) => {
  await signIn(context, "genai");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("mockmeai:show-mascot", "false"),
  );
  await page.goto("/interview/new");
  await expect(
    page.getByRole("heading", { name: "Your practice brief" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("combobox", { name: "Problem", exact: true })
      .locator("option"),
  ).toHaveCount(8);
  await page
    .getByRole("radio", { name: "AI / ML system design", exact: true })
    .check();
  await expect(
    page
      .getByRole("combobox", { name: "Problem", exact: true })
      .locator("option"),
  ).toHaveCount(
    (await (await page.request.get("/api/problems")).json()).problems.filter(
      (p: { track: string }) => p.track === "genai",
    ).length,
  );
  await page.getByLabel("Difficulty").selectOption("senior");
  for (const problemId of [
    "ai-chat-assistant",
    "tool-using-ai-agent",
    "enterprise-rag-assistant",
  ]) {
    await page
      .getByRole("combobox", { name: "Problem", exact: true })
      .selectOption(problemId);
    await expect(
      page.getByRole("combobox", { name: "Problem", exact: true }),
    ).toHaveValue(problemId);
  }
  expect(await page.locator("body").innerText()).not.toMatch(
    /5M documents|50M chunks|150 GB|Permissions checked only after generation/,
  );
  mkdirSync("artifacts/genai", { recursive: true });
  await page.screenshot({
    path: "artifacts/genai/brief-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/genai/brief-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  let starts = 0;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/interview/start") &&
      request.method() === "POST"
    )
      starts++;
  });
  const opened = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/interview/start") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  expect((await opened).ok()).toBe(true);
  await expect(page).toHaveURL(/\/interview\/[a-f0-9-]+$/);
  await expect(page.locator(".excalidraw canvas").first()).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("How many employees and how many documents are there?");
  const reply = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/chat") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  expect((await reply).ok()).toBe(true);
  await expect(page.getByText(/20,000 employees/).first()).toBeVisible();
  expect(await page.locator("body").innerText()).toContain("5M documents");
  await expect(
    page.getByRole("button", { name: "End interview", exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: "artifacts/genai/interview.png" });
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(
    page.getByRole("heading", { name: "Too short to score", exact: true }),
  ).toBeVisible({ timeout: 25000 });
  expect(starts).toBe(1);
  await expect(
    page
      .locator("header.live-header")
      .getByLabel("AI / ML system design", { exact: true }),
  ).toBeVisible();
  await page.goto("/mock/history");
  await expect(
    page
      .locator(".session-title")
      .getByLabel("AI / ML system design", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
