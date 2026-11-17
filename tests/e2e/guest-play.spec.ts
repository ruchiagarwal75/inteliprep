import { test, expect } from "@playwright/test";
import { signIn } from "./fixture-auth";
import {
  openPlayLevel,
  playView,
  fillPlayAnswer,
  dismissLevelUp,
  capturePlay,
} from "./play-helpers";
import { modelCalls } from "./course-evidence";
const fixture = "https://127.0.0.1:4444";
const origin = "http://localhost:3100";
test("guest starts without sign-in, quizzes without AI and links the same UUID", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(
    "https://challenges.cloudflare.com/turnstile/v0/api.js?*",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "window.turnstile={render:function(el,opts){setTimeout(function(){opts.callback('ci-only-token')},30);return 'stub'},remove:function(){},reset:function(){}};",
      }),
  );
  const before = await modelCalls(page);
  await page.goto("/");
  await page
    .getByRole("link", { name: "Start free", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(
    page.getByRole("heading", { name: /Level up for the AI engineer role/ }),
  ).toBeVisible({ timeout: 30000 });
  const cookieBefore = (await context.cookies()).filter(
    (c) =>
      c.name.startsWith("inteliprep-auth") && !c.name.includes("code-verifier"),
  );
  expect(cookieBefore.length).toBeGreaterThan(0);
  await openPlayLevel(page, 0);
  const view = await playView(page);
  await fillPlayAnswer(page, view);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await dismissLevelUp(page);
  const prompt = page.getByRole("complementary", {
    name: "Save your guest progress",
  });
  await expect(prompt).toBeVisible();
  await capturePlay(page, "first-drill-prompt", "guest-play");
  await prompt.getByRole("button", { name: "Not now" }).click();
  await expect(prompt).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  const continued = await playView(page);
  const xpBeforeLink = await page
    .locator("[data-play-points-target]")
    .textContent();
  expect(xpBeforeLink?.trim()).toMatch(/^[1-9][\d,]* XP$/u);
  const blocked = await context.request.post("/api/play/slides", {
    headers: { origin },
    data: { level: 2, index: 0 },
  });
  expect(blocked.status()).toBe(403);
  await page.goto("/play/rag/topics/2");
  await expect(page).toHaveURL(/\/sign-in\?guest=limit/);
  await expect(
    page.getByText("Sign in to save your XP and unlock the next topics."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Google/ }).click();
  await expect(page).toHaveURL(/\/play$/);
  const after = await context.request.get(
    `${fixture}/fixture/session?account=guestPlay`,
  );
  const session = await after.json();
  expect(session.user.id).toBe("f0770000-0000-4000-8000-000000000001");
  expect(session.user.is_anonymous).toBe(false);
  // The same saved attempt and result remain readable after linking.
  const saved = await context.request.get(
    `/api/play/round?sessionId=${view.sessionId}`,
  );
  expect(saved.status()).toBe(200);
  expect(await saved.json()).toMatchObject({
    question: { attemptId: continued.question.attemptId },
  });
  await expect(page.locator("[data-play-points-target]")).toHaveText(
    xpBeforeLink ?? "",
  );
  expect(await modelCalls(page)).toBe(before);
  const events = await context.request.get(
    `${fixture}/fixture/guest-events?account=guestPlay`,
  );
  expect(await events.json()).toEqual([
    "guest_first_drill_done",
    "guest_prompt_shown",
    "guest_prompt_shown",
    "guest_signed_in",
    "guest_started",
  ]);
  expect(errors).toEqual([]);
});
test("guest cannot call paid APIs, open mock/admin or lose a session to identity conflicts", async ({
  page,
  context,
}) => {
  await signIn(context, "guestConflict");
  const before = await modelCalls(page);
  for (const path of [
    "/api/chat",
    "/api/interview/start",
    "/api/interview/end",
    "/api/play/boss/cleared",
    "/api/play/prompt",
  ]) {
    const r = await context.request.post(path, {
      headers: { origin },
      data: {},
    });
    expect(r.status(), path).toBe(401);
  }
  expect((await context.request.get("/api/admin/overview")).status()).toBe(401);
  for (const path of ["/mock", "/interview/new", "/play/rag/topics/3"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
  }
  await page.getByRole("button", { name: /Google/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    /already.*account|cannot.*link/i,
  );
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (c) => c.name === "inteliprep-auth" && c.value.includes("base64-"),
    ),
  ).toBe(true);
  expect(
    (
      await context.request.post("/api/play/profile", {
        headers: { origin },
        data: { timeZone: "America/Los_Angeles" },
      })
    ).status(),
  ).toBe(200);
  expect(await modelCalls(page)).toBe(before);
});
test("webview sign-in explains the browser restriction at phone width", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: "LinkedInApp/9",
  });
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/sign-in`);
    await expect(
      page.getByText("Open in your browser to sign in", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copy sign-in link" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
