import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { bossView } from "./boss-browser-helpers";
import { rendered } from "./rendered";
import { modelCalls } from "./course-evidence";
const output = "artifacts/mock-beta-requests";
test("a requested beta mock has clear Pro copy, one approved trial and private admin decisions", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  mkdirSync(output, { recursive: true });
  const before = await modelCalls(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const theme of ["light", "dark"] as const)
    for (const width of [1440, 375]) {
      await bossView(page, context, "mockTrial", theme, width, "/mock");
      const card = rendered(
        page.locator('[data-locked-problem="url-shortener"]'),
      );
      await card.scrollIntoViewIfNeeded();
      await expect(card).toContainText("Planned for Pro");
      await expect(card).toContainText(
        "Free to try during beta. Paid access planned after beta.",
      );
      await expect(
        card.getByRole("button", { name: "Request beta access", exact: true }),
      ).toBeEnabled();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: `${output}/mock-${theme}-${width}.png` });
    }
  const card = rendered(page.locator('[data-locked-problem="url-shortener"]'));
  await card
    .getByRole("button", { name: "Request beta access", exact: true })
    .click();
  await expect(card).toContainText("Access requested.");
  await page.reload();
  await expect(
    rendered(page.locator('[data-locked-problem="url-shortener"]')),
  ).toContainText("Access requested.");
  const denied = await context.request.post("/api/admin/mock-requests", {
    headers: { origin: "http://localhost:3100" },
    data: {},
  });
  expect(denied.status()).toBe(403);
  const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    await signIn(adminContext, "admin");
    const admin = await adminContext.newPage();
    await admin.goto(
      "/admin/mock-requests?includeExcluded=1&search=mock-trial%40example.invalid",
    );
    const row = admin.getByRole("region", {
      name: "mock-trial@example.invalid: Design a URL shortener",
      exact: true,
    });
    await expect(row).toBeVisible();
    await admin.screenshot({
      path: `${output}/admin-request.png`,
      fullPage: true,
    });
    await row
      .getByRole("button", { name: "Approve one trial", exact: true })
      .click();
    await expect(row).toContainText("One trial approved");
    const current = rendered(
      page.locator('[data-locked-problem="url-shortener"]'),
    );
    await current
      .getByRole("button", { name: "Check access status", exact: true })
      .click();
    await expect(current).toContainText("Approved for one trial interview.");
    await current
      .getByRole("link", { name: "Start trial", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your practice brief" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Problem", exact: true }),
    ).toHaveValue("url-shortener");
    await expect(
      page
        .getByRole("combobox", { name: "Problem", exact: true })
        .locator("option"),
    ).toHaveCount(1);
    const started = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/interview/start") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    const response = await started;
    expect(response.status()).toBe(200);
    const saved = await response.json();
    await expect(page).toHaveURL(new RegExp(`/interview/${saved.sessionId}$`));
    const second = await context.request.post("/api/interview/start", {
      headers: { origin: "http://localhost:3100" },
      data: {
        problemId: "url-shortener",
        level: "mid",
        requestId: crypto.randomUUID(),
      },
    });
    expect(second.status()).toBe(403);
    await page
      .getByRole("link", { name: "Shardling home", exact: true })
      .click();
    await page.getByRole("link", { name: "Mock", exact: true }).click();
    const used = rendered(
      page.locator('[data-locked-problem="url-shortener"]'),
    );
    await expect(used).toContainText("Your trial has been used.");
    await expect(
      used.getByRole("link", { name: "Open interview", exact: true }),
    ).toHaveAttribute("href", `/interview/${saved.sessionId}`);
    // Revoke only unused starts. A created interview remains resumable.
    await admin.reload();
    await row
      .getByRole("button", { name: "Revoke access", exact: true })
      .click();
    await expect(row).toContainText("revoked");
    const resumed = await context.request.post("/api/interview/resume", {
      headers: { origin: "http://localhost:3100" },
      data: {
        sessionId: saved.sessionId,
        problemId: "url-shortener",
        level: saved.level,
        resumeToken: saved.resumeToken,
      },
    });
    expect(resumed.status()).toBe(200);
  } finally {
    await adminContext.close();
  }
  expect(errors).toEqual([]);
  expect(await modelCalls(page)).toBe(before);
});
