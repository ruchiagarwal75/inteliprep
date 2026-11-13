import { expect, test } from "@playwright/test";
import { bossView, bossShot } from "./boss-browser-helpers";
import { modelCalls } from "./course-evidence";
test("one real Free creation, refresh/resume and ending without any model call", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await bossView(page, context, "bossFlow", "light", 1440, "/mock");
  const before = await modelCalls(page);
  let starts = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/api/interview/start")
    )
      starts++;
  });
  await page
    .locator("#rag-boss")
    .getByRole("button", { name: "Start boss", exact: true })
    .click();
  const pending = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/interview/start") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start boss", exact: true })
    .evaluate((button) => {
      if (!(button instanceof HTMLButtonElement))
        throw Error("Missing confirm button");
      button.click();
      button.click();
    });
  const response = await pending;
  expect(response.status()).toBe(200);
  const opened = await response.json();
  await page.waitForURL(new RegExp(`/interview/${opened.sessionId}$`));
  await expect(page.locator(".excalidraw canvas").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "End interview", exact: true }),
  ).toBeEnabled();
  await page.goto("/play/rag#rag-boss");
  await expect(page.locator("#rag-boss")).toHaveAttribute(
    "data-boss-state",
    "in_progress",
  );
  await page.getByRole("link", { name: "Resume boss", exact: true }).click();
  await page.waitForURL(new RegExp(`/interview/${opened.sessionId}$`));
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page.waitForURL(/\/results$/u);
  await expect(
    page.getByRole("heading", { name: "Too short to score", exact: true }),
  ).toBeVisible();
  await bossShot(page, "empty-boss-result-light-1440");
  await page.goto("/play/rag#rag-boss");
  await expect(page.locator("#rag-boss")).toHaveAttribute(
    "data-boss-state",
    "used",
  );
  await expect(
    page.getByRole("button", { name: "Retry with Pro", exact: true }),
  ).toBeVisible();
  expect(starts).toBe(1);
  expect(await modelCalls(page)).toBe(before);
});
