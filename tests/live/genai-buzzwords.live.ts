import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import fixtures from "../fixtures/genai-buzzwords.json";
import { getProblem } from "@/lib/problems";
import { gradeInterview } from "@/lib/interview-grading";
import { fixtureScene } from "./genai-fixture";
import { chatMessageSchema } from "@/lib/chat";
import { z } from "zod";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
for (const fixture of fixtures)
  it(`rejects buzzword-only Senior ${fixture.problemId}`, async () => {
    const problem = getProblem(fixture.problemId);
    if (!problem) throw new Error("Missing problem");
    const messages = z.array(chatMessageSchema).parse(fixture.messages);
    const label = `${problem.id}-buzzword-grade`;
    const scorecard = await metered(label, () =>
      gradeInterview(
        problem,
        "senior",
        { messages, scene: fixtureScene(fixture.nodes, fixture.edges) },
        new Date().toISOString(),
      ),
    );
    mkdirSync("artifacts/genai-retest", { recursive: true });
    writeFileSync(
      `artifacts/genai-retest/${label}.json`,
      JSON.stringify(
        { scorecard, calls: calls.filter((c) => c.label === label) },
        null,
        2,
      ),
    );
    expect(["no", "strong_no", "insufficient_evidence"]).toContain(
      scorecard.signal,
    );
    expect(scorecard.gaps.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(scorecard)).not.toContain("\u2014");
    expect(
      scorecard.areas.filter((a) => a.score !== null && a.score <= 2).length,
    ).toBeGreaterThan(scorecard.areas.length / 2);
  });
