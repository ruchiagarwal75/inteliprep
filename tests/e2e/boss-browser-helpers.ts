import { rendered } from "./rendered";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signIn } from "./fixture-auth";
import { bossAccounts } from "./boss-fixture.mjs";
import { newSavedInterview } from "../../src/lib/saved-interview";
import { scorecardSchema } from "../../src/lib/scorecard";
export const bossScreens = "artifacts/boss-and-access";
export async function bossView(
  page: Page,
  context: BrowserContext,
  account: string,
  theme: "light" | "dark",
  width: number,
  path = "/play/rag#rag-boss",
) {
  await signIn(context, account);
  await context.addCookies([
    { name: "mockmeai-theme", value: theme, url: "http://localhost:3100" },
  ]);
  await page.setViewportSize({ width, height: width === 1440 ? 669 : 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(rendered(page.locator("html"))).toHaveAttribute(
    "data-theme",
    theme,
  );
  await page.evaluate(() => document.fonts.ready);
}
export async function bossShot(page: Page, name: string) {
  mkdirSync(bossScreens, { recursive: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${bossScreens}/${name}.png`,
    animations: "disabled",
  });
}
export async function seedBossScorecard(
  page: Page,
  account: "bossUsed" | "bossDefeated",
) {
  const response = await page.request.get(
    `https://127.0.0.1:4444/fixture/boss?account=${account}`,
  );
  expect(response.ok()).toBe(true);
  const data: {
    sessionId: string;
    startedAt: string;
    deadlineAt: string;
    endedAt: string;
    signal: "yes" | "no";
  } = await response.json();
  const answer =
    "I would check permissions before retrieval and test revocations and weak evidence with a labeled set.";
  const card = scorecardSchema.parse({
    problemId: "enterprise-rag-assistant",
    level: "mid",
    problemTitle: "Design an enterprise RAG assistant",
    endedAt: data.endedAt,
    signal: data.signal,
    summary: "Your explanation needs more detail on the failure paths.",
    session: {
      startedAt: data.startedAt,
      elapsedSeconds: 2700,
      allowedSeconds: 2700,
      limited: false,
      note: "Complete practice interview.",
    },
    areas: [
      "Requirements and estimation",
      "Ingestion and retrieval",
      "Grounded answers and citations",
      "Freshness and reliability",
      "Cost, operations and evolution",
      "Evaluation and quality",
      "Safety and security",
    ].map((area) => ({
      area,
      score: account === "bossUsed" ? 2 : 3,
      rationale: "Explain the mechanism and how you would test a failure.",
      evidence: [{ kind: "message", messageIndex: 1, quote: answer }],
    })),
    strengths: [],
    gaps: [],
    nextPractice: {
      problemId: "enterprise-rag-assistant",
      title: "Design an enterprise RAG assistant",
      focus: "Practice the failure paths.",
    },
  });
  const start = {
    problemId: card.problemId,
    level: card.level,
    track: "genai" as const,
    sessionId: data.sessionId,
    phase: {
      id: "clarify",
      title: "Clarify requirements",
      position: 1,
      total: 5,
    },
    timing: {
      startedAt: data.startedAt,
      deadlineAt: data.deadlineAt,
      durationMinutes: 45 as const,
    },
    openingMessage: {
      role: "assistant" as const,
      content: "Which requirements would you clarify?",
    },
  };
  const saved = newSavedInterview(start, {
    elements: [],
    appState: { viewBackgroundColor: "" },
    files: {},
  });
  saved.hasEnded = true;
  saved.endedAt = data.endedAt;
  saved.scorecard = card;
  saved.messages.push({ role: "user", content: answer });
  await page.goto("/mock/history");
  await expect(
    page.getByRole("heading", { name: "Recent sessions", exact: true }),
  ).toBeVisible();
  await page.evaluate(
    async ({ userId, saved }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(`inteliprep:account:${userId}`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(["interviews", "meta"], "readwrite");
          tx.objectStore("interviews").put(saved);
          tx.objectStore("meta").put(saved.id, "active");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { userId: bossAccounts[account].id, saved },
  );
  return data;
}
