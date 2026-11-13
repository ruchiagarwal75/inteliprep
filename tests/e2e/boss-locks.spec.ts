import { expect, test } from "@playwright/test";
import { bossView, bossShot } from "./boss-browser-helpers";
import { bossAccounts } from "./boss-fixture.mjs";
import { signIn } from "./fixture-auth";
import { modelCalls } from "./course-evidence";

test("beta locks stay in place for Free, Pro and admin while RAG keeps its unlock", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  const before = await modelCalls(page);
  for (const theme of ["light", "dark"] as const)
    for (const width of [1440, 375])
      for (const path of ["/mock", "/interview/new"]) {
        await bossView(page, context, "bossNotify", theme, width, path);
        await expect(page.locator("[data-locked-problem]")).toHaveCount(12);
        await expect(page.locator("[data-available-problem]")).toHaveCount(1);
        await expect(page.locator("#rag-boss")).toHaveAttribute(
          "data-boss-state",
          "ready",
        );
        await expect(
          page
            .locator("#rag-boss")
            .getByRole("button", { name: "Start boss", exact: true }),
        ).toBeEnabled();
        for (const button of await page
          .locator("[data-locked-problem] button")
          .all())
          await expect(button).toBeDisabled();
        await bossShot(
          page,
          `locked-${path === "/mock" ? "mock" : "brief"}-${theme}-${width}`,
        );
      }
  await bossView(page, context, "bossLocked", "light", 1440, "/mock");
  await expect(page.locator("#rag-boss")).toHaveAttribute(
    "data-boss-state",
    "locked",
  );
  await expect(page.locator("#rag-boss")).toContainText(
    "Pass Topic 9 to unlock",
  );
  await expect(
    page.getByRole("button", { name: "Start boss", exact: true }),
  ).toHaveCount(0);
  const lockedResponse = await context.request.post("/api/interview/start", {
    headers: { origin: "http://localhost:3100" },
    data: { problemId: "url-shortener", level: "mid" },
  });
  expect(lockedResponse.status()).toBe(403);
  expect((await lockedResponse.json()).code).toBe("mock_unavailable");
  const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    await signIn(adminContext, "admin");
    const admin = await adminContext.newPage();
    await admin.goto(
      `/admin/users/${bossAccounts.bossNotify.id}?includeExcluded=1`,
    );
    const access = admin.getByRole("region", {
      name: "Mock access",
      exact: true,
    });
    await access.getByRole("button", { name: "Pro", exact: true }).click();
    await expect(access).toContainText("Plan: Pro");
    await bossView(page, context, "bossNotify", "light", 1440, "/mock");
    await expect(page.locator("[data-locked-problem]")).toHaveCount(12);
    await page.getByRole("link", { name: "Choose mock", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Problem", exact: true }),
    ).toHaveValue("enterprise-rag-assistant");
    for (const client of [context, adminContext]) {
      const denied = await client.request.post("/api/interview/start", {
        headers: { origin: "http://localhost:3100" },
        data: { problemId: "url-shortener", level: "mid" },
      });
      expect(denied.status()).toBe(403);
      expect((await denied.json()).code).toBe("mock_unavailable");
    }
    await access.getByRole("button", { name: "Free", exact: true }).click();
    await expect(access).toContainText("Plan: Free");
  } finally {
    await adminContext.close();
  }
  expect(await modelCalls(page)).toBe(before);
});
