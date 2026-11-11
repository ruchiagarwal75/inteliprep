import { readGradingResponse } from "../../src/lib/read-grading-response";
import { interviewEndResponseSchema } from "../../src/lib/scorecard";
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
  await page.getByRole("link", { name: "Start free", exact: true }).click();
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
async function signIn(
  context: BrowserContext,
  account = "invited",
  provider = "google",
) {
  const response = await context.request.get(
    `${fixture}/fixture/session?account=${account}&provider=${provider}`,
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
    const storageReports: unknown[] = [];
    context.on("request", (request) => {
      if (
        request.url().endsWith("/api/monitoring/client-error") &&
        request.postDataJSON()?.kind === "storage"
      )
        storageReports.push(request.postDataJSON());
    });
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
      page.getByRole("heading", { name: "Too short to score", exact: true }),
    ).toBeVisible({ timeout: 25000 });
    await expect(
      page.getByRole("button", { name: "Retry scorecard", exact: true }),
    ).toHaveCount(0);
    const feedback = page.getByRole("region", {
      name: "Interview feedback",
      exact: true,
    });
    await expect(feedback).toBeVisible();
    expect(
      await page
        .getByRole("tabpanel", { name: "Scorecard", exact: true })
        .evaluate((outcome) => {
          const form = document.querySelector(
            '[aria-label="Interview feedback"]',
          );
          return (
            !!form &&
            !!(
              outcome.compareDocumentPosition(form) &
              Node.DOCUMENT_POSITION_FOLLOWING
            )
          );
        }),
    ).toBe(true);
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
        .getByLabel("Anything else you want to share? (optional)")
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
    } else {
      await feedback.getByRole("button", { name: "Skip", exact: true }).click();
    }
    await expect(feedback.getByRole("status")).toHaveText("Thanks!");
    await expect(feedback).toHaveCount(0);
    await page.getByRole("tab", { name: "Transcript", exact: true }).click();
    await expect(page.getByText(answer, { exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Interview results", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Too short to score", exact: true }),
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
    expect(storageReports).toEqual([]);
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
    .getByLabel("Anything else you want to share? (optional)")
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
    await expect(
      page.getByRole("list", { name: "Scorecard progress", exact: true }),
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
    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["permissions-policy"]).toContain("microphone=()");
  }
  expect(await (await context.request.get("/api/health")).json()).toEqual({
    status: "ok",
  });
  for (const path of ["/privacy", "/terms"]) {
    await page.goto(path);
    await expect(
      page
        .locator('footer[aria-label="Legal"]')
        .getByRole("link", { name: "Privacy policy", exact: true }),
    ).toBeVisible();
  }
});
test("beta funnel shows persisted per-user activity and denies non-admin access", async ({
  page,
  context,
}) => {
  await signIn(context);
  expect((await context.request.get("/api/admin/funnel")).status()).toBe(403);
  expect((await page.goto("/admin/funnel"))?.status()).toBe(404);
  await signIn(context, "admin");
  await page.goto("/admin/funnel?search=browser-smoke");
  await expect(
    page.getByRole("heading", { name: "Beta funnel", exact: true }),
  ).toBeVisible();
  const data = await (
    await context.request.get("/api/admin/funnel?search=browser-smoke")
  ).json();
  expect(data.counts).toMatchObject({
    signed_in: 1,
    started: 1,
    finished: 1,
    sent_feedback: 1,
    second_started: 1,
    score_threshold_passed: 0,
    scorecard_opened: 0,
  });
  expect(data.users[0]).toMatchObject({
    started: 3,
    finished: 3,
    second_started: 1,
  });
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({
    path: `${screenshots}/admin-funnel.png`,
    fullPage: true,
  });
});

test("an unavailable interviewer keeps the message and offers a working Retry reply", async ({
  page,
  context,
}) => {
  await signIn(context, "recovery");
  await page.goto("/interview/new");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();
  let calls = 0;
  await page.route("**/api/chat", async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Interviewer unavailable. Please try again.",
          code: "INTERVIEWER_UNAVAILABLE",
        }),
      });
    else await route.continue();
  });
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(
      "I would measure CPU utilization and database query latency under load.",
    );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Interviewer unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry reply", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry reply", exact: true }),
  ).toHaveCount(0);
  await expect.poll(() => calls).toBe(2);
  await expect(
    page.getByRole("button", { name: "End interview", exact: true }),
  ).toBeEnabled();
  await expect(page).toHaveURL(/\/interview\/[a-f0-9-]+$/);
});

test("an active deadline ends automatically and keeps an unfinished draft unsent", async ({
  page,
  context,
}) => {
  await signIn(context, "expiry");
  await page.goto("/interview/new");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("My unfinished answer must stay unsent.");
  await page.clock.install();
  await page.clock.fastForward(46 * 60 * 1000);
  await expect(page).toHaveURL(/\/results$/, { timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Too short to score", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Saved unsent draft (not included in scoring)", { exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Chat", exact: true })
      .getByText("My unfinished answer must stay unsent.", { exact: true }),
  ).toBeVisible();
});
test("an expired server transcript opens as an unscored saved record", async ({
  page,
  context,
}) => {
  await signIn(context, "archive");
  await page.goto("/interview/new");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();
  await page.route("**/api/interview/resume", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        code: "INTERVIEW_SESSION_EXPIRED",
        error: "This interview has no verified server transcript.",
      }),
    }),
  );
  let gradingCalls = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/interview/end")) gradingCalls++;
  });
  await page.reload();
  await expect(
    page.getByText(
      "This interview timed out while you were away, so it can’t be scored. Your chat and drawing are saved below.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Interview stage", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Start a new interview", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry scorecard", exact: true }),
  ).toHaveCount(0);
  expect(gradingCalls).toBe(0);
});

test("timer position is stable across all five stage names on laptops", async ({
  page,
  context,
}) => {
  await signIn(context, "layout");
  await page.goto("/interview/new");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(page.getByRole("timer")).toBeVisible();
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const positions: number[] = [];
    for (const [index, name] of [
      "Clarify requirements",
      "Draw and explain",
      "Core design",
      "Scaling and reliability",
      "Tradeoffs and wrap-up",
    ].entries()) {
      await page
        .getByRole("region", { name: "Interview stage", exact: true })
        .evaluate(
          (node, { index, name }) => {
            const spans = node.querySelectorAll("span");
            spans[0].textContent = `Stage ${index + 1} of 5`;
            spans[1].textContent = name;
          },
          { index, name },
        );
      const bounds = await page.getByRole("timer").boundingBox();
      if (!bounds) throw Error("Timer missing");
      positions.push(bounds.x);
    }
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
  }
});

test("the brief remembers level and defaults to the suggested next problem", async ({
  page,
  context,
}) => {
  await signIn(context, "preferences");
  await page.goto("/interview/new");
  await page
    .getByRole("combobox", { name: "Problem", exact: true })
    .selectOption("url-shortener");
  await page
    .getByRole("combobox", { name: "Difficulty", exact: true })
    .selectOption("senior");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  const grading = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/interview/end") && r.request().method() === "POST",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "End interview", exact: true })
    .click();
  const network = await grading;
  const decoded = await readGradingResponse(
    new Response(await network.text(), {
      status: network.status(),
      headers: await network.allHeaders(),
    }),
    () => {},
  );
  const result = interviewEndResponseSchema.parse(decoded.body);
  await expect(
    page.getByRole("heading", { name: "Too short to score", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "MockMeAI home", exact: true }).click();
  await page.goto("/interview/new");
  await expect(
    page.getByRole("combobox", { name: "Difficulty", exact: true }),
  ).toHaveValue("senior");
  await expect(
    page.getByRole("combobox", { name: "Problem", exact: true }),
  ).toHaveValue(result.scorecard.nextPractice.problemId);
});

test("an explained design can return from drawing and finish without a new walkthrough", async ({
  page,
  context,
}) => {
  await signIn(context, "explanation");
  await page.goto("/interview/new");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.clock.install();
  const settle = async () => {
    await expect(
      page.getByRole("button", { name: "End interview", exact: true }),
    ).toBeEnabled();
    await page.clock.runFor(600);
  };
  const draw = async (label: string, y: number) => {
    const canvas = await page
      .locator(".excalidraw canvas")
      .first()
      .boundingBox();
    if (!canvas) throw Error("Canvas missing");
    await page.mouse.click(canvas.x + 80, canvas.y + y);
    await page.keyboard.press("Escape");
    await page.keyboard.press("r");
    await page.mouse.move(canvas.x + 120, canvas.y + y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + 420, canvas.y + y + 150, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.press("Escape");
    await page.mouse.dblclick(canvas.x + 270, canvas.y + y + 75);
    await page.keyboard.type(label);
    await page.keyboard.press("Escape");
  };
  await page
    .getByRole("button", { name: "Start drawing", exact: true })
    .click();
  await settle();
  await draw("API", 140);
  await page
    .getByRole("button", { name: "Ready to explain", exact: true })
    .click();
  await settle();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(
      "The API validates requests and stores each update durably before acknowledging it. I would measure CPU utilization and query latency before scaling.",
    );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await settle();
  await page
    .getByRole("button", { name: "Back to drawing", exact: true })
    .click();
  await settle();
  await draw("Cache", 330);
  await page
    .getByRole("button", { name: "Ready to explain", exact: true })
    .click();
  await settle();
  await expect(
    page.getByRole("button", { name: "Done explaining", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Done explaining", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause to draw", exact: true }),
  ).toBeVisible();
});

test("an invited email from a non-Google provider is denied by the real invitation SQL", async ({
  page,
  context,
}) => {
  await context.request.post(`${fixture}/fixture/invitation`, {
    data: { account: "uninvited", approved: true },
  });
  try {
    await signIn(context, "uninvited", "email");
    await page.goto("/interview/new");
    await expect(page).toHaveURL(/not-invited/u);
    await expect(
      page.getByRole("heading", { name: "You're not invited yet" }),
    ).toBeVisible();
    const denied = await context.request.post("/api/interview/start", {
      data: {},
    });
    expect(denied.status()).toBe(403);
    await expect(
      page.getByRole("checkbox", {
        name: "Also remove my practice history from this browser",
      }),
    ).toBeChecked();
  } finally {
    await context.request.post(`${fixture}/fixture/invitation`, {
      data: { account: "uninvited", approved: false },
    });
  }
});
test("whiteboard fonts are self-hosted and sign-out removes history only when requested", async ({
  page,
  context,
}) => {
  await signIn(context, "signout");
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/interview/new");
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  const whiteboard = page.locator(".excalidraw");
  await expect(whiteboard.locator("canvas").first()).toBeVisible();
  const bounds = await whiteboard.locator("canvas").first().boundingBox();
  if (!bounds) throw Error("No whiteboard");
  await page.mouse.click(bounds.x + 80, bounds.y + 130);
  await page.keyboard.press("Escape");
  await page.keyboard.press("t");
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.keyboard.type("Redis cache");
  await page.keyboard.press("Escape");
  await expect
    .poll(() =>
      requests.some(
        (url) => url.includes("/fonts/excalidraw/") && url.endsWith(".woff2"),
      ),
    )
    .toBe(true);
  expect(requests.some((url) => url.includes("esm.sh"))).toBe(false);
  expect(
    errors.filter((text) => /content security policy/iu.test(text)),
  ).toEqual([]);
  await page.goto("/");
  await page.getByRole("button", { name: "Your profile" }).click();
  const remove = page.getByRole("checkbox", {
    name: "Also remove my practice history from this browser",
  });
  await expect(remove).not.toBeChecked();
  await remove.check();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/sign-in/u);
  const names = await page.evaluate(async () =>
    (await indexedDB.databases()).map((db) => db.name),
  );
  expect(names).not.toContain(
    "inteliprep:account:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  );
});
