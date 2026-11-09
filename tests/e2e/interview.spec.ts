import { expect, test, type BrowserContext } from "@playwright/test";
import { mkdirSync } from "node:fs";
const screenshots = "artifacts/beta-feedback";
const fixture = "https://127.0.0.1:4444";
test("automated browsing does not generate visitor events", async ({
  page,
}) => {
  const events: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/monitoring/viewer")
      events.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Start practice", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  expect(events).toEqual([]);
});
test("sign-in links the same anonymous browser on a non-entry page", async ({
  browser,
}) => {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36",
  });
  try {
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "webdriver", { get: () => false }),
    );
    const page = await context.newPage();
    const events: { visitorId: string }[] = [];
    await page.route("**/api/monitoring/viewer", async (route) => {
      events.push(route.request().postDataJSON());
      await route.fulfill({ status: 204 });
    });
    await page.goto("http://localhost:3100/");
    await expect.poll(() => events.length).toBeGreaterThanOrEqual(1);
    const browserId = events[0].visitorId;
    await signIn(context);
    await page.goto("http://localhost:3100/not-invited");
    await expect.poll(() => events.length).toBeGreaterThanOrEqual(2);
    expect(events.every((event) => event.visitorId === browserId)).toBe(true);
    expect(
      events.every((event) => Object.keys(event).join() === "visitorId"),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
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
for (const durationMinutes of [45, 60]) {
  test(`${durationMinutes}-minute interview from brief through saved results, with no external model calls`, async ({
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
      "1 hour",
    ]);
    await page.getByLabel("Duration").selectOption(String(durationMinutes));
    let starts = 0;
    page.on("request", (request) => {
      if (
        request.url().endsWith("/api/interview/start") &&
        request.method() === "POST"
      )
        starts++;
    });
    const startResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/interview/start") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    const opened = await (await startResponse).json();
    expect(opened.timing.durationMinutes).toBe(durationMinutes);
    expect(
      Date.parse(opened.timing.deadlineAt) -
        Date.parse(opened.timing.startedAt),
    ).toBe(durationMinutes * 60000);
    await expect(page).toHaveURL(/\/interview\/[a-f0-9-]+$/);
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.locator(".excalidraw canvas").first()).toBeVisible();
    const canvas = await page
      .locator(".excalidraw canvas")
      .first()
      .boundingBox();
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
    if (durationMinutes === 60) {
      await expect(
        page.getByRole("status").filter({ hasText: "✓ Saved" }),
      ).toBeVisible();
      const resume = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/interview/resume") &&
          r.request().method() === "POST",
      );
      await page.reload();
      expect((await (await resume).json()).timing).toEqual(opened.timing);
      await expect(page.getByText(answer, { exact: true })).toBeVisible();
      const [minutes, seconds] = (await page.getByRole("timer").innerText())
        .split(":")
        .map(Number);
      expect(minutes * 60 + seconds).toBeLessThanOrEqual(3600);
      expect(minutes * 60 + seconds).toBeGreaterThan(3540);
    }
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
    const feedback = page.getByRole("region", {
      name: "Interview feedback",
      exact: true,
    });
    await expect(feedback).toBeVisible();
    await expect(
      feedback.getByRole("button", { name: "Send", exact: true }),
    ).toBeDisabled();
    if (durationMinutes === 45) {
      await feedback
        .getByRole("button", { name: "Loved it", exact: true })
        .click();
      await expect(
        feedback.getByRole("button", { name: "Loved it", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await feedback.getByRole("button", { name: "Yes", exact: true }).click();
      await feedback
        .getByLabel("Anything else you want to tell us? (optional)")
        .fill(
          "The whiteboard helped me explain my design. <script>plain text only</script>",
        );
      mkdirSync(screenshots, { recursive: true });
      await feedback.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${screenshots}/feedback-desktop.png` });
      await page.setViewportSize({ width: 520, height: 1000 });
      await feedback.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${screenshots}/feedback-narrow.png` });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.setViewportSize({ width: 1440, height: 900 });
      await feedback.getByRole("button", { name: "Send", exact: true }).click();
    } else
      await feedback.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(feedback.getByRole("status")).toHaveText("Thanks!");
    await expect(feedback).toHaveCount(0);
    await page.getByRole("tab", { name: "Transcript", exact: true }).click();
    await expect(page.getByText(answer, { exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Interview results", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Interview scorecard", exact: true }),
    ).toBeVisible();
    await expect(feedback).toHaveCount(0);
    // Server persistence still suppresses the card if browser dismissal data is cleared.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage))
        if (key.startsWith("mockmeai:feedback:")) localStorage.removeItem(key);
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Interview results", exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () =>
        (
          await context.request.get(
            `/api/feedback?interviewId=${opened.sessionId}`,
          )
        ).json(),
      )
      .toEqual({ handled: true });
    await expect(feedback).toHaveCount(0);
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
    expect((await context.request.get("/api/admin/visitors")).status()).toBe(
      403,
    );
    expect((await context.request.get("/api/admin/invites")).status()).toBe(
      403,
    );
    expect((await context.request.get("/api/admin/feedback")).status()).toBe(
      403,
    );
    const deniedPage = await page.goto("/admin/feedback");
    expect(deniedPage?.status()).toBe(404);
    expect(
      (
        await context.request.post("/api/admin/invites/email", {
          headers: { origin: "http://localhost:3100" },
          data: { notificationId: "11111111-1111-4111-8111-111111111111" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.post("/api/admin/invites", {
          headers: { origin: "http://localhost:3100" },
          data: { email: "browser-smoke@example.invalid", approved: true },
        })
      ).status(),
    ).toBe(403);
  });
}
test("admin sees answered and skipped feedback; menu feedback stays independent", async ({
  page,
  context,
}) => {
  await signIn(context, "admin");
  await page.goto("/admin/feedback");
  await expect(
    page.getByRole("heading", { name: "Feedback", exact: true }),
  ).toBeVisible();
  const data = await (await context.request.get("/api/admin/feedback")).json();
  expect(data.counts).toMatchObject({
    answered: 1,
    skipped: 1,
    loved: 1,
    yes: 1,
  });
  await expect(
    page.getByText(
      "The whiteboard helped me explain my design. <script>plain text only</script>",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Skipped", { exact: true })).toBeVisible();
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({
    path: `${screenshots}/admin-feedback.png`,
    fullPage: true,
  });
  const answered = data.entries.find(
    (entry: { skipped: boolean }) => !entry.skipped,
  );
  await page.goto(`/admin/users/${answered.userId}`);
  await expect(
    page.getByRole("region", { name: "Practice feedback", exact: true }),
  ).toHaveCount(2);
  await page.goto("/");
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Send feedback",
    exact: true,
  });
  await dialog
    .getByLabel("Anything else you want to tell us? (optional)")
    .fill("Menu-only feedback from owner");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Thanks!");
  await expect(dialog).toHaveCount(0);
  const filtered = await (
    await context.request.get("/api/admin/feedback?search=Menu-only")
  ).json();
  expect(filtered.total).toBe(0);
  const included = await (
    await context.request.get(
      "/api/admin/feedback?includeExcluded=1&search=Menu-only",
    )
  ).json();
  expect(included.total).toBe(1);
  expect(included.entries[0].source).toBe("menu");
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
test("empty interview feedback is skippable while its scorecard is still generating", async ({
  page,
  context,
}) => {
  await signIn(context);
  await page.goto("/interview/new");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interview\/[a-f0-9-]+$/);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/interview/end", async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await page
      .getByRole("button", { name: "End interview", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "End interview", exact: true })
      .click();
    await expect(page).toHaveURL(/\/results$/);
    const feedback = page.getByRole("region", {
      name: "Interview feedback",
      exact: true,
    });
    await expect(feedback).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Generating your scorecard…",
        exact: true,
      }),
    ).toBeVisible();
    await feedback.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(feedback.getByRole("status")).toHaveText("Thanks!");
    await expect(feedback).toHaveCount(0);
  } finally {
    release();
  }
  await expect(
    page.getByText(
      "You ended before giving a technical answer. Retry to get feedback.",
      { exact: true },
    ),
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
