import { expect, test } from "@playwright/test";
import { bossView, bossShot } from "./boss-browser-helpers";
import { bossAccounts } from "./boss-fixture.mjs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";
test("Free catalogs, Pro interest and admin plan changes use persisted access", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const before = await modelCalls(page);
  for (const theme of ["light", "dark"] as const)
    for (const width of [1440, 375]) {
      for (const path of ["/mock", "/interview/new"]) {
        await bossView(page, context, "bossNotify", theme, width, path);
        await expect(page.locator("[data-locked-problem]")).toHaveCount(13);
        await expect(
          page.getByRole("link", {
            name: "Free once as the RAG World boss",
            exact: true,
          }),
        ).toHaveAttribute("href", "/play/rag#rag-boss");
        await bossShot(
          page,
          `locked-${path === "/mock" ? "mock" : "brief"}-${theme}-${width}`,
        );
        await page
          .getByRole("button", { name: "Choose mock", exact: true })
          .first()
          .click();
        const dialog = page.getByRole("dialog", {
          name: "Mock interviews are part of Pro",
          exact: true,
        });
        await expect(dialog).toContainText("Pro isn't for sale yet.");
        await bossShot(page, `pro-modal-${theme}-${width}`);
        await page.keyboard.press("Escape");
      }
    }
  await page
    .getByRole("button", { name: "Choose mock", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Notify me", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "You're on the list.",
  );
  const denied = await context.request.post(
    `/api/admin/users/${bossAccounts.bossNotify.id}/plan`,
    {
      headers: { origin: "http://localhost:3100" },
      data: { action: "plan", plan: "pro" },
    },
  );
  expect(denied.status()).toBe(403);
  const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    await signIn(adminContext, "admin");
    const admin = await adminContext.newPage();
    await admin.setViewportSize({ width: 1440, height: 669 });
    await admin.goto(
      `/admin/users/${bossAccounts.bossNotify.id}?includeExcluded=1`,
    );
    const access = admin.getByRole("region", {
      name: "Mock access",
      exact: true,
    });
    await expect(access).not.toContainText("Not requested");
    await bossShot(admin, "admin-mock-access-light-1440");
    await access.getByRole("button", { name: "Pro", exact: true }).click();
    await expect(access).toContainText("Plan: Pro");
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your practice brief", exact: true }),
    ).toBeVisible();
    await access.getByRole("button", { name: "Free", exact: true }).click();
    await expect(access).toContainText("Plan: Free");
    await page.reload();
    await expect(page.locator("[data-locked-problem]")).toHaveCount(13);
  } finally {
    await adminContext.close();
  }
  expect(await modelCalls(page)).toBe(before);
});
