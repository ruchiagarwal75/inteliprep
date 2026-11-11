import { expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getProblem, createInterviewStart } from "@/lib/problems";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { getCachedSession } from "@/lib/interview-session-store";
import { chatTurnRequestSchema } from "@/lib/chat-turn";
import { verifiedEndMessages } from "@/lib/interview-transcript";
import { acquireInterviewEnd } from "@/lib/interview-sessions";
import { gradeInterview } from "@/lib/interview-grading";
import type { Scene } from "@/lib/scene";
import type { ChatMessage } from "@/lib/chat";
import { fixtureSchema } from "./genai-fixture";
import { fullGenaiTurn } from "./full-genai-turn";
import { fullInterviewImages, fullInterviewScenes } from "./full-genai-images";
import { fullInterviewScript, scriptedAnswer } from "./full-genai-script";
import { calls, metered } from "./model-meter";
import { fullInterviewUsage } from "./full-genai-usage";

/** Real application model calls, isolated local sessions, and a Date-only simulated clock. */
export async function runFullGenaiInterview(problemId: string) {
  const problem = getProblem(problemId);
  if (!problem) throw new Error("Missing benchmark problem");
  const fixture = fixtureSchema.parse(
    JSON.parse(readFileSync(`tests/fixtures/genai/${problemId}.json`, "utf8")),
  );
  const scenes = fullInterviewScenes(fixture);
  const images = await fullInterviewImages(scenes);
  const epoch = Date.now();
  const label = problemId + ":full45";
  const rows = fullInterviewScript(fixture);
  const turns: {
    minute: number;
    stage: number;
    step: string;
    message: ChatMessage;
    reply: string;
    modelCalls: number;
    image: boolean;
  }[] = [];
  mkdirSync("artifacts/genai-retest-2", { recursive: true });
  // Test-only checkpoint key for this isolated process, never written to an env file.
  vi.stubEnv(
    "INTERVIEW_RESUME_SECRET",
    "mockmeai-full-script-test-checkpoint-key",
  );
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(epoch);
  try {
    return await withCandidateIdentity(randomUUID(), () =>
      metered(label, async () => {
        const started = createInterviewStart(problem, "senior", 45);
        let checkpoint = started.resumeToken,
          previousScene: Scene | undefined,
          previousTopic: string | undefined;
        const visited = new Set([0]),
          covered = new Set<number>();
        let answerIndex = 0;
        for (const row of rows) {
          vi.setSystemTime(epoch + row.minute * 60_000);
          const scene = scenes[row.board];
          const content =
            row.content ??
            scriptedAnswer(
              problem,
              fixture,
              previousTopic,
              answerIndex++,
              covered,
              row.minute === 35.5,
            );
          const message: ChatMessage = {
            role: "user",
            content,
            ...(row.action
              ? { action: row.action, source: "control" as const }
              : {}),
          };
          if (row.area !== undefined) covered.add(row.area);
          const session = getCachedSession(started.sessionId);
          if (!session?.transcript)
            throw new Error("Missing verified benchmark transcript");
          const payload = chatTurnRequestSchema.parse({
            problemId,
            level: "senior",
            sessionId: started.sessionId,
            resumeToken: checkpoint,
            turnId: randomUUID(),
            afterMessageCount: session.transcript.messages.length,
            message,
            scene,
            previousScene,
            ...(row.image ? { diagramImage: images[row.board] } : {}),
          });
          const before = calls.length;
          const completed = await fullGenaiTurn(problem, payload);
          const { reply, step, stage } = completed;
          checkpoint = completed.checkpoint;
          previousTopic = completed.topic;
          visited.add(stage);
          previousScene = scene;
          turns.push({
            minute: row.minute,
            stage: stage + 1,
            step,
            message,
            reply,
            modelCalls: calls.length - before,
            image: Boolean(row.image),
          });
          console.info(
            "GenAI full interview",
            problemId,
            row.minute,
            "minutes",
            "stage",
            stage + 1,
          );
          writeFileSync(
            `artifacts/genai-retest-2/${problemId}-full-progress.json`,
            JSON.stringify(
              {
                timelineSimulated: true,
                turns,
                calls: calls.filter((c) => c.label === label),
              },
              null,
              2,
            ),
          );
        }
        vi.setSystemTime(epoch + 45 * 60_000);
        const session = getCachedSession(started.sessionId);
        if (!session?.transcript)
          throw new Error("Missing final verified transcript");
        const snapshot = {
          messages: verifiedEndMessages(
            started.sessionId,
            session.transcript.messages,
          ),
          scene: scenes.updated,
          diagramImage: images.updated,
        };
        const ending = acquireInterviewEnd(
          started.sessionId,
          { problemId, level: "senior" },
          snapshot,
          checkpoint,
        );
        // Ending is frozen at simulated 45:00; grading uses real wall time for its budget.
        vi.useRealTimers();
        try {
          const scorecard = await gradeInterview(
            problem,
            "senior",
            ending.snapshot ?? snapshot,
            ending.endedAt,
            undefined,
            {
              timing: ending.timing,
              answeredStageCount: ending.answeredStageCount,
            },
          );
          ending.complete(scorecard);
          const observations = calls.filter((c) => c.label === label);
          const result = {
            problemId,
            level: "senior",
            timelineSimulated: true,
            elapsedSeconds:
              (Date.parse(ending.endedAt) -
                Date.parse(ending.timing.startedAt)) /
              1000,
            candidateTurns: rows.length,
            answeredStages: ending.answeredStageCount,
            visitedStages: [...visited].sort().map((i) => i + 1),
            modelImageAttachments: turns.filter((t) => t.image).length + 1,
            ...fullInterviewUsage(observations),
            scorecard,
            turns,
            calls: observations,
          };
          writeFileSync(
            `artifacts/genai-retest-2/${problemId}-full45.json`,
            JSON.stringify(result, null, 2),
          );
          expect(result.elapsedSeconds).toBe(2700);
          expect(result.visitedStages).toEqual([1, 2, 3, 4, 5]);
          expect(result.answeredStages).toBeGreaterThanOrEqual(2);
          expect(result.scorecard.notScoredReason).toBeUndefined();
          expect(result.scorecard.areas).toHaveLength(7);
          expect(observations.some((c) => c.operation === "feedback")).toBe(
            true,
          );
          expect(result.unpricedCalls).toBe(0);
          return result;
        } finally {
          ending.release();
        }
      }),
    );
  } finally {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  }
}
