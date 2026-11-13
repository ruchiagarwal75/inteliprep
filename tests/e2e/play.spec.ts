import { expect, test } from "@playwright/test";
import { signIn } from "./fixture-auth";
import { playView, fillPlayAnswer, dismissLevelUp } from "./play-helpers";
import { captureCourse, modelCalls } from "./course-evidence";
test.use({ actionTimeout: 15000 });
test("RAG course teaches, quizzes and saves an owner-only notebook without model calls", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(180000);
  await signIn(context, "play");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await modelCalls(page);
  await page.goto("/play/rag");
  await expect(
    page
      .getByRole("list", { name: "RAG course topics" })
      .locator(":scope > li"),
  ).toHaveCount(10);
  await expect(page.getByText("Soon", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Open chest after Topic/u }),
  ).toHaveCount(3);
  await captureCourse(page, "path");
  const gated = await context.request.post("/api/play/round", {
    headers: { Origin: "http://localhost:3100" },
    data: {
      requestId: crypto.randomUUID(),
      topic: "rag-course",
      mode: "level",
      level: 1,
      timeZone: "UTC",
    },
  });
  expect(gated.status()).toBe(403);
  await page
    .getByRole("link", { name: "Topic 1: Ingestion and chunking", exact: true })
    .click();
  await expect(page.getByLabel("Slide counter")).toHaveText("1 / 13");
  await expect(
    page.getByRole("button", { name: "Start quiz", exact: true }),
  ).toHaveCount(0);
  await captureCourse(page, "slide");
  for (let i = 2; i <= 13; i++) {
    await page.keyboard.press("ArrowRight");
    await expect(page.getByLabel("Slide counter")).toHaveText(`${i} / 13`);
    if (i === 6) await captureCourse(page, "slide-overlap");
    if (i === 8) await captureCourse(page, "slide-split-table");
  }
  await captureCourse(page, "last-slide");
  let starts = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/play/round") && r.method() === "POST") starts++;
  });
  await page.getByRole("button", { name: "Start quiz", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check answer", exact: true }),
  ).toBeVisible();
  expect(starts).toBe(1);
  const session = new URL(page.url()).searchParams.get("session");
  for (let i = 0; i < 7; i++) {
    const view = await playView(page),
      q = view.question;
    expect(q.courseKind).toBeTruthy();
    expect(q.total).toBe(7);
    if (i === 0) await captureCourse(page, "titled-drill");
    expect(JSON.stringify(q)).not.toMatch(
      /correctIndex|keyIdea|ifWrong|"why":/,
    );
    await expect(page.getByRole("radio")).toHaveCount(4);
    await expect(
      page.locator("textarea,input[type=number],input[type=text]"),
    ).toHaveCount(0);
    if (i === 4) {
      expect(q.courseKind).toBe("math");
      await captureCourse(page, "math-question");
      if (q.type !== "spot_flaw") throw Error("Expected choice");
      const option = q.options.find((o) => o.text === "16M");
      if (!option) throw Error("Missing authored wrong answer");
      await page.getByRole("radio").nth(Number(option.id)).check();
    } else await fillPlayAnswer(page, view);
    await page
      .getByRole("button", { name: "Check answer", exact: true })
      .click();
    await dismissLevelUp(page);
    const sheet = page.getByLabel("Drill result", { exact: true });
    await expect(sheet).toHaveAttribute("data-correct", String(i !== 4));
    await expect(sheet.locator("details")).toHaveAttribute("open", "");
    await expect(sheet.getByText("Answer:", { exact: true })).toBeVisible();
    if (i === 4) {
      await expect(
        sheet.getByText("That forgets the overlap: 4,000 / 500 = 8.", {
          exact: true,
        }),
      ).toBeVisible();
      await captureCourse(page, "wrong-sheet");
    }
    await sheet.getByRole("button", { name: "Continue", exact: true }).click();
    if (i < 6)
      await expect(
        page.getByRole("button", { name: "Check answer", exact: true }),
      ).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "Topic passed", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("6 of 7 correct", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review slides", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "1 of 3 stars", exact: true }),
  ).toBeVisible();
  await captureCourse(page, "topic-complete");
  await page.getByRole("link", { name: "Notebook", exact: true }).click();
  await expect(page.locator('[data-answered="true"]')).toHaveCount(7);
  await expect(page.locator('[data-answered="false"]')).toHaveCount(88);
  await expect(page.locator('[data-notebook-question="T2-Q1"]')).toHaveText(
    "Fast searchTry it first",
  );
  await captureCourse(page, "notebook");
  const foreign = await browser.newContext();
  try {
    await signIn(foreign, "theme");
    expect(
      (
        await foreign.request.get(`/api/play/round?sessionId=${session}`)
      ).status(),
    ).toBe(404);
  } finally {
    await foreign.close();
  }
  expect(await modelCalls(page)).toBe(before);
  expect(errors).toEqual([]);
});
