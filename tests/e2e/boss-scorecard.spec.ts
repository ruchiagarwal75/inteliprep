import { expect, test } from "@playwright/test";
import { bossView, bossShot, seedBossScorecard } from "./boss-browser-helpers";
import { modelCalls } from "./course-evidence";
test("cached RAG feedback links each low area to Learn on any plan", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const before = await modelCalls(page);
  for (const theme of ["light", "dark"] as const)
    for (const width of [1440, 375]) {
      await bossView(page, context, "bossUsed", theme, width);
      const saved = await seedBossScorecard(page, "bossUsed");
      await page.goto(`/interview/${saved.sessionId}/results`);
      await expect(
        page.getByRole("heading", { name: "Interview scorecard", exact: true }),
      ).toBeVisible();
      const maps = [
        ["Requirements and estimation", [0]],
        ["Ingestion and retrieval", [1, 2, 3, 4]],
        ["Grounded answers and citations", [5, 6]],
        ["Freshness and reliability", [8]],
        ["Cost, operations and evolution", [8]],
        ["Evaluation and quality", [7]],
        ["Safety and security", [9]],
      ] as const;
      for (const [area, topics] of maps)
        for (const topic of topics) {
          await expect(
            page
              .getByRole("navigation", {
                name: `Replay topics for ${area}`,
                exact: true,
              })
              .getByRole("link", {
                name: `Replay Topic ${topic}`,
                exact: true,
              }),
          ).toHaveAttribute("href", `/play/rag/topics/${topic}`);
        }
      await page
        .getByRole("navigation", {
          name: "Replay topics for Safety and security",
          exact: true,
        })
        .scrollIntoViewIfNeeded();
      await bossShot(page, `topic-links-${theme}-${width}`);
      await page
        .getByRole("navigation", {
          name: "Replay topics for Safety and security",
          exact: true,
        })
        .getByRole("link", { name: "Replay Topic 9", exact: true })
        .click();
      await expect(
        page
          .getByRole("heading", { name: /Failure modes and safety/u })
          .first(),
      ).toBeVisible();
    }
  expect(await modelCalls(page)).toBe(before);
});
