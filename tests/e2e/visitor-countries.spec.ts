import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { signIn } from "./fixture-auth";

test("country totals stay private and readable at desktop and phone widths", async ({
  page,
  context,
}) => {
  await signIn(context, "invited");
  expect((await context.request.get("/api/admin/visitors")).status()).toBe(403);
  await signIn(context, "admin");
  await page.goto("/admin?includeExcluded=1");
  const region = page.getByRole("region", { name: "Account countries" });
  await expect(
    region.getByRole("heading", { name: "Countries", exact: true }),
  ).toBeVisible();
  await expect(
    region.getByRole("row", { name: "India 1 0", exact: true }),
  ).toBeVisible();
  await expect(
    region.getByRole("row", { name: "United States 0 1", exact: true }),
  ).toBeVisible();
  const response = await context.request.get(
    "/api/admin/visitors?includeExcluded=1",
  );
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('"countryCode":"IN"');
  expect(body).not.toContain("raw_ip");
  expect(body).not.toContain("ip_hash");
  expect(body).not.toContain("rawIp");
  await mkdir("artifacts/visitor-countries", { recursive: true });
  for (const [name, width] of [
    ["desktop", 1440],
    ["phone", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await region.scrollIntoViewIfNeeded();
    await expect(region).toBeVisible();
    expect(
      await region.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      await region.evaluate((el) => {
        const bounds = el.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth;
      }),
    ).toBe(true);
    await region.screenshot({
      path: `artifacts/visitor-countries/${name}.png`,
    });
  }
  await page.goto("/privacy");
  await expect(
    page.getByText("are cleared by a daily cleanup after 30 days", {
      exact: false,
    }),
  ).toBeVisible();
});
