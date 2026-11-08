import { expect, test, type BrowserContext } from "@playwright/test";
const fixture = "https://127.0.0.1:4444";
async function signIn(context: BrowserContext, account = "invited") {
  const response = await context.request.get(
    `${fixture}/fixture/session?account=${account}`,
  );
  const session = await response.json();
  await context.addCookies([
    {
      name: "inteliprep-auth",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      url: "http://localhost:3100",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
}
test("private interview from brief through saved results, with no external model calls", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(context);
  await page.addInitScript(() =>
    localStorage.setItem("mockmeai:show-mascot", "false"),
  );
  await page.goto("/interview/new");
  await expect(
    page.getByRole("heading", { name: "Your practice brief" }),
  ).toBeVisible();
  await expect(page.getByLabel("Duration").locator("option")).toHaveText([
    "45 minutes",
  ]);
  let starts = 0;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/interview/start") &&
      request.method() === "POST"
    )
      starts++;
  });
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interview\/[a-f0-9-]+$/);
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.locator(".excalidraw canvas").first()).toBeVisible();
  const canvas = await page.locator(".excalidraw canvas").first().boundingBox();
  if (!canvas) throw new Error("Whiteboard canvas has no bounds");
  await page.mouse.click(canvas.x + 180, canvas.y + 140);
  await page.keyboard.press("r");
  await page.mouse.move(canvas.x + 180, canvas.y + 140);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 320, canvas.y + 240, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  const answer =
    "I would measure CPU utilization and database query latency under a load test before changing capacity.";
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(answer);
  const reply = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/chat") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  expect((await reply).ok()).toBe(true);
  await expect(
    page.getByRole("button", { name: "End interview", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(
    page.getByRole("heading", { name: "Interview scorecard", exact: true }),
  ).toBeVisible({ timeout: 25000 });
  await expect(
    page.getByRole("button", { name: "Retry scorecard", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Transcript", exact: true }).click();
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Interview results", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Interview scorecard", exact: true }),
  ).toBeVisible();
  expect(starts).toBe(1);
  expect(errors).toEqual([]);
  const stats = await (
    await context.request.get(fixture + "/fixture/stats")
  ).json();
  expect(stats.modelCalls).toBeGreaterThan(0);
  const denied = await context.request.post("/api/interview/start", {
    data: {
      problemId: "single-server-scaling",
      level: "mid",
      durationMinutes: 1,
    },
  });
  expect(denied.status()).toBe(400);
  expect((await context.request.get("/api/admin/visitors")).status()).toBe(403);
  expect((await context.request.get("/api/admin/invites")).status()).toBe(403);
  expect(
    (
      await context.request.post("/api/admin/invites", {
        headers: { origin: "http://localhost:3100" },
        data: { email: "browser-smoke@example.invalid", approved: true },
      })
    ).status(),
  ).toBe(403);
});
test("database approval and revocation take effect with the same signed-in session", async ({
  page,
  context,
}) => {
  await signIn(context, "uninvited");
  await page.goto("/interview/new");
  await expect(
    page.getByRole("heading", { name: "You're not invited yet", exact: true }),
  ).toBeVisible();
  try {
    await context.request.post(fixture + "/fixture/invitation", {
      data: { account: "uninvited", approved: true },
    });
    await page.goto("/interview/new");
    await expect(
      page.getByRole("heading", { name: "Your practice brief", exact: true }),
    ).toBeVisible();
  } finally {
    await context.request.post(fixture + "/fixture/invitation", {
      data: { account: "uninvited", approved: false },
    });
  }
  const response = await context.request.post("/api/interview/start", {
    headers: { origin: "http://localhost:3100" },
    data: { problemId: "single-server-scaling", level: "mid" },
  });
  expect(response.status()).toBe(403);
  expect((await response.json()).code).toBe("INVITE_REQUIRED");
  expect(response.headers()["x-interview-auth-error"]).toBeUndefined();
  await page.goto("/interview/new");
  await expect(
    page.getByRole("heading", { name: "You're not invited yet", exact: true }),
  ).toBeVisible();
});
test("uninvited and signed-out users cannot start, and policies are linked", async ({
  page,
  context,
  playwright,
}) => {
  const anonymous = await playwright.request.newContext({
    baseURL: "http://localhost:3100",
  });
  expect(
    (
      await anonymous.post("/api/interview/start", {
        data: { problemId: "single-server-scaling", level: "mid" },
      })
    ).status(),
  ).toBe(401);
  await anonymous.dispose();
  await signIn(context, "uninvited");
  await page.goto("/interview/new");
  await expect(
    page.getByRole("heading", { name: "You're not invited yet", exact: true }),
  ).toBeVisible();
  expect(
    (
      await context.request.post("/api/interview/start", {
        data: { problemId: "single-server-scaling", level: "mid" },
      })
    ).status(),
  ).toBe(403);
  for (const path of ["/", "/interview/new", "/api/health"]) {
    const response = await context.request.get(path);
    const headers = response.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["permissions-policy"]).toContain("microphone=()");
  }
  for (const path of ["/privacy", "/terms"]) {
    await page.goto(path);
    await expect(
      page
        .locator('footer[aria-label="Legal"]')
        .getByRole("link", { name: "Privacy policy", exact: true }),
    ).toBeVisible();
  }
});
