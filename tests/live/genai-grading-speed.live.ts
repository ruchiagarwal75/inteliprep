import { afterAll, expect, it, vi } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { chatMessageSchema } from "@/lib/chat";
import { getProblem } from "@/lib/problems";
import { gradeInterview } from "@/lib/interview-grading";
import { createInterviewTiming } from "@/lib/interview-timer";
import { fixtureScene } from "./genai-fixture";
import { calls, metered } from "./model-meter";
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
const cases = z
  .array(
    z.object({
      problemId: z.string(),
      nodes: z.array(z.string()),
      edges: z.array(z.tuple([z.number(), z.number()])),
      messages: z.array(chatMessageSchema),
    }),
  )
  .parse(
    JSON.parse(
      readFileSync("tests/fixtures/genai-grading-performance.json", "utf8"),
    ),
  );
const results: {
  sample: number;
  problemId: string;
  durationMs: number;
  success: boolean;
  progress: string[];
}[] = [];
afterAll(() => {
  const sorted = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const report = {
    samples: results.length,
    concurrency: 2,
    clockSimulated: false,
    p50Ms: sorted.length === 10 ? (sorted[4] + sorted[5]) / 2 : null,
    p95Ms: sorted.length === 10 ? sorted[9] : null,
    p95Method: "nearest rank; with ten samples p95 is the slowest sample",
    results,
    calls,
  };
  mkdirSync("artifacts/genai-retest-3", { recursive: true });
  writeFileSync(
    "artifacts/genai-retest-3/grading-speed.json",
    JSON.stringify(report, null, 2),
  );
  expect(results).toHaveLength(10);
  expect(results.every((r) => r.success)).toBe(true);
  expect(report.p95Ms).toBeLessThan(60000);
});
it.concurrent.each(Array.from({ length: 10 }, (_, index) => index))(
  "grades full-length evidence sample %i in under a minute",
  async (sample) => {
    const row = cases[sample % cases.length],
      problem = getProblem(row.problemId);
    if (!problem) throw Error("Missing problem");
    const progress: string[] = [];
    const start = performance.now();
    let success = false;
    try {
      const endedAt = new Date().toISOString();
      const scorecard = await metered(`speed-${sample}`, () =>
        gradeInterview(
          problem,
          "senior",
          { messages: row.messages, scene: fixtureScene(row.nodes, row.edges) },
          endedAt,
          undefined,
          {
            timing: createInterviewTiming(45, Date.parse(endedAt) - 2700000),
            answeredStageCount: 5,
            onProgress: (stage) => progress.push(stage),
          },
        ),
      );
      expect(scorecard.areas).toHaveLength(7);
      expect(progress[0]).toBe("reading");
      expect(progress).toContain("writing");
      expect(progress).toContain("checking");
      success = true;
    } finally {
      results.push({
        sample,
        problemId: row.problemId,
        durationMs: performance.now() - start,
        success,
        progress,
      });
    }
  },
);
