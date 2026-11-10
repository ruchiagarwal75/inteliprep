import { expect } from "vitest";
import { writeFileSync } from "node:fs";
import type { ProblemDefinition } from "@/lib/problems";
import type { ChatMessage } from "@/lib/chat";
import { gradeInterview } from "@/lib/interview-grading";
import { fixtureScene, type GenaiFixture } from "./genai-fixture";
import { calls, metered } from "./model-meter";

export async function compareSeniorDesigns(
  fixture: GenaiFixture,
  problem: ProblemDefinition,
  root: string,
) {
  const outputs = [];
  for (const strength of ["weak", "strong"] as const) {
    const messages: ChatMessage[] = fixture[strength].flatMap((content, i) => [
      {
        role: "assistant" as const,
        content: `Please explain your approach to ${problem.rubric[i].area}.`,
      },
      { role: "user" as const, content },
    ]);
    const snapshot = {
      messages,
      scene: fixtureScene(
        strength === "strong" ? fixture.strongNodes : fixture.weakNodes,
        strength === "strong" ? fixture.strongEdges : [],
      ),
    };
    const label = `${problem.id}-${strength}-grade`;
    const scorecard = await metered(label, () =>
      gradeInterview(problem, "senior", snapshot, new Date().toISOString()),
    );
    writeFileSync(
      `${root}/${label}.json`,
      JSON.stringify(
        { scorecard, calls: calls.filter((c) => c.label === label) },
        null,
        2,
      ),
    );
    outputs.push(scorecard);
  }
  const [weak, strong] = outputs;
  expect(["yes", "strong_yes"]).toContain(strong.signal);
  expect(["strong_no", "no", "insufficient_evidence"]).toContain(weak.signal);
  expect(weak.gaps.length).toBeGreaterThanOrEqual(2);
  expect(
    strong.areas.filter(
      (a, i) => a.score !== null && a.score > (weak.areas[i].score ?? 0),
    ).length,
  ).toBeGreaterThan(strong.areas.length / 2);
}
