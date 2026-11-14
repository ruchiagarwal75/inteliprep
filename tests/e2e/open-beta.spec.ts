import { test, expect, type BrowserContext } from "@playwright/test";
import { mkdirSync } from "node:fs";
const fixture = "https://127.0.0.1:4444",
  origin = "http://localhost:3100";
async function signIn(context: BrowserContext, account: string) {
  const response = await context.request.get(
      `${fixture}/fixture/session?account=${account}`,
    ),
    session = await response.json();
  await context.addCookies([
    {
      name: "inteliprep-auth",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      url: origin,
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
}
test("automatic access, owner overrides and email status use isolated QA accounts", async ({
  page,
  context,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(context, "openBeta");
  await page.goto("/play");
  await expect(page).toHaveURL(/\/play/);
  expect(
    (
      await context.request.post("/api/play/profile", {
        headers: { origin },
        data: { timeZone: "America/Los_Angeles" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await context.request.post("/api/admin/notifications", {
        headers: { origin },
        data: { notificationId: "11111111-1111-4111-8111-111111111111" },
      })
    ).status(),
  ).toBe(403);
  const admin = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  try {
    await signIn(admin, "admin");
    const panel = await admin.newPage();
    await panel.goto("/admin/access?search=open-beta-qa");
    await expect(
      panel.getByRole("heading", { name: "Automatic access (1)", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByRole("heading", {
        name: "Account and spending emails",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      panel.getByText("Private QA message body", { exact: true }),
    ).toHaveCount(0);
    mkdirSync("artifacts/open-beta", { recursive: true });
    await panel.screenshot({
      path: "artifacts/open-beta/access-desktop.png",
      fullPage: true,
    });
    await panel
      .getByRole("button", {
        name: "Revoke access for open-beta-qa@example.invalid",
        exact: true,
      })
      .click();
    await expect(panel.getByRole("status")).toContainText("Revoked access");
    const denied = await context.request.post("/api/play/profile", {
      headers: { origin },
      data: { timeZone: "America/Los_Angeles" },
    });
    expect(denied.status()).toBe(403);
    expect(denied.headers()["x-interview-auth-error"]).toBeUndefined();
    await page.goto("/play");
    await expect(
      page.getByRole("heading", {
        name: "Account access is restricted",
        exact: true,
      }),
    ).toBeVisible();
    await panel.reload();
    await panel
      .getByRole("button", {
        name: "Restore access for open-beta-qa@example.invalid",
        exact: true,
      })
      .click();
    await expect(panel.getByRole("status")).toContainText("Restored access");
    expect(
      (
        await context.request.post("/api/play/profile", {
          headers: { origin },
          data: { timeZone: "America/Los_Angeles" },
        })
      ).status(),
    ).toBe(200);
    await panel.setViewportSize({ width: 375, height: 812 });
    await panel.screenshot({
      path: "artifacts/open-beta/access-phone.png",
      fullPage: true,
    });
    expect(
      await panel.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await panel.goto("/admin");
    await expect(
      panel.getByRole("heading", { name: "Production AI budget", exact: true }),
    ).toBeVisible();
    await panel.screenshot({
      path: "artifacts/open-beta/budget-phone.png",
      fullPage: true,
    });
    await panel.setViewportSize({ width: 1440, height: 900 });
    await panel.screenshot({
      path: "artifacts/open-beta/budget-desktop.png",
      fullPage: true,
    });
  } finally {
    await admin.close();
  }
  expect(errors).toEqual([]);
});
