import { expect, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { getCachedSession } from "@/lib/interview-session-store";
import { verifiedEndMessages } from "@/lib/interview-transcript";
import { acquireInterviewEnd } from "@/lib/interview-sessions";
import { gradeInterview } from "@/lib/interview-grading";
import type { ProblemDefinition } from "@/lib/problems";
import type { Scene } from "@/lib/scene";
import { fullInterviewImages } from "./full-genai-images";
import type { AdaptiveTurn } from "./full-genai-script";
import type { CandidateDiagram, CandidateQuality } from "./model-candidate";
import { calls, metered } from "./model-meter";
import { fullInterviewUsage } from "./full-genai-usage";
import { auditFullInterview } from "./full-genai-audit";
export async function finishFullGenaiInterview({
  problem,
  sessionId,
  checkpoint,
  epoch,
  scene,
  diagram,
  quality,
  label,
  path,
  turns,
  visited,
}: {
  problem: ProblemDefinition;
  sessionId: string;
  checkpoint: string | undefined;
  epoch: number;
  scene: Scene;
  diagram: CandidateDiagram;
  quality: CandidateQuality;
  label: string;
  path: string;
  turns: AdaptiveTurn[];
  visited: Set<number>;
}) {
  const problemId = problem.id;
  vi.setSystemTime(epoch + 45 * 60_000);
  const session = getCachedSession(sessionId);
  if (!session?.transcript) throw Error("Missing final verified transcript");
  const messages = verifiedEndMessages(sessionId, session.transcript.messages);
  const snapshot = {
    messages,
    scene,
    diagramImage: (await fullInterviewImages({ final: scene })).final,
  };
  const ending = acquireInterviewEnd(
    sessionId,
    { problemId, level: "senior" },
    snapshot,
    checkpoint,
  );
  vi.useRealTimers();
  try {
    const gradingStarted = performance.now();
    const scorecard = await metered(label + ":app", () =>
      gradeInterview(
        problem,
        "senior",
        ending.snapshot ?? snapshot,
        ending.endedAt,
        undefined,
        {
          timing: ending.timing,
          answeredStageCount: ending.answeredStageCount,
        },
      ),
    );
    const gradingMs = performance.now() - gradingStarted;
    ending.complete(scorecard);
    const audit = await auditFullInterview(
      messages,
      label,
      problem.genai?.facts.map((fact) => ({
        id: fact.id,
        text: fact.answers.senior,
      })),
    );
    const usage = (kind: string) =>
      fullInterviewUsage(calls.filter((c) => c.label === label + ":" + kind));
    const result = {
      problemId,
      level: "senior",
      quality,
      timelineSimulated: true,
      elapsedSeconds:
        (Date.parse(ending.endedAt) - Date.parse(ending.timing.startedAt)) /
        1000,
      candidateTurns: turns.length,
      answeredStages: ending.answeredStageCount,
      visitedStages: [...visited].sort().map((i) => i + 1),
      gradingMs,
      ...audit,
      appUsage: usage("app"),
      simulatorUsage: usage("candidate"),
      auditUsage: usage("audit"),
      allUsage: fullInterviewUsage(
        calls.filter((c) => c.label.startsWith(label + ":")),
      ),
      scorecard,
      transcript: messages,
      turns,
      diagram,
      calls: calls.filter((c) => c.label.startsWith(label + ":")),
    };
    writeFileSync(path + ".json", JSON.stringify(result, null, 2));
    expect(result.elapsedSeconds).toBe(2700);
    expect(result.answeredStages).toBeGreaterThanOrEqual(2);
    expect(result.scorecard.notScoredReason).toBeUndefined();
    expect(result.scorecard.areas).toHaveLength(7);
    expect(result.repeatedSentences).toEqual([]);
    expect(result.topicsOverTwice).toEqual([]);
    expect(result.cannedFallbacks).toEqual([]);
    expect(result.findings).toEqual([]);
    expect(result.scorecard.signal).toMatch(
      quality === "strong" ? /^(?:strong_)?yes$/u : /^(?:strong_)?no$/u,
    );
    expect(result.appUsage.unpricedCalls).toBe(0);
    return result;
  } finally {
    ending.release();
  }
}
