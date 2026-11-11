import { vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { getProblem, createInterviewStart } from "@/lib/problems";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { getCachedSession } from "@/lib/interview-session-store";
import { chatTurnRequestSchema } from "@/lib/chat-turn";
import type { Scene } from "@/lib/scene";
import type { ChatMessage } from "@/lib/chat";
import { fixtureScene } from "./genai-fixture";
import { fullGenaiTurn } from "./full-genai-turn";
import { fullInterviewImages } from "./full-genai-images";
import { fullInterviewScript, type AdaptiveTurn } from "./full-genai-script";
import { finishFullGenaiInterview } from "./full-genai-finish";
import { calls, metered } from "./model-meter";
import {
  modelCandidate,
  type CandidateDiagram,
  type CandidateQuality,
} from "./model-candidate";

/** Real adaptive candidates and application calls; only the 45-minute clock is simulated. */
export async function runFullGenaiInterview(
  problemId: string,
  quality: CandidateQuality = "strong",
) {
  const problem = getProblem(problemId);
  if (!problem) throw Error("Missing benchmark problem");
  const epoch = Date.now(),
    label = `${problemId}-${quality}`;
  const path = `artifacts/genai-retest-3/${label}-adaptive`;
  const turns: AdaptiveTurn[] = [];
  let diagram: CandidateDiagram = { nodes: [], edges: [] },
    scene = fixtureScene([]),
    previousScene: Scene | undefined,
    revisionNote = "";
  mkdirSync("artifacts/genai-retest-3", { recursive: true });
  vi.stubEnv(
    "INTERVIEW_RESUME_SECRET",
    "mockmeai-full-script-test-checkpoint-key",
  );
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(epoch);
  try {
    return await withCandidateIdentity(randomUUID(), async () => {
      const started = createInterviewStart(problem, "senior", 45);
      let checkpoint = started.resumeToken;
      const visited = new Set([0]);
      for (const row of fullInterviewScript()) {
        vi.setSystemTime(epoch + row.minute * 60_000);
        const session = getCachedSession(started.sessionId);
        if (!session?.transcript)
          throw Error("Missing verified benchmark transcript");
        let content = row.content ?? "";
        if (row.task) {
          const candidate = await modelCandidate({
            // This is precisely the public Brief projection, never private facts or rubrics.
            brief: problem.levels.senior.openingMessage,
            messages: session.transcript.messages,
            diagram,
            quality,
            label,
            task:
              row.task +
              (row.minute === 32
                ? " Your own revision note: " + revisionNote
                : ""),
          });
          if (row.diagram && candidate.nodes.length) {
            diagram = { nodes: candidate.nodes, edges: candidate.edges };
            scene = fixtureScene(diagram.nodes, diagram.edges);
            revisionNote = candidate.message;
          }
          if (!row.action) content = candidate.message;
        }
        const message: ChatMessage = {
          role: "user",
          content,
          ...(row.action
            ? { action: row.action, source: "control" as const }
            : {}),
        };
        const diagramImage = row.image
          ? (await fullInterviewImages({ current: scene })).current
          : undefined;
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
          ...(diagramImage ? { diagramImage } : {}),
        });
        const before = calls.length;
        const completed = await metered(label + ":app", () =>
          fullGenaiTurn(problem, payload),
        );
        checkpoint = completed.checkpoint;
        previousScene = scene;
        visited.add(completed.stage);
        turns.push({
          minute: row.minute,
          stage: completed.stage + 1,
          step: completed.step,
          message,
          reply: completed.reply,
          modelCalls: calls.length - before,
          image: Boolean(diagramImage),
          topic: completed.topic,
        });
        console.info(
          "Adaptive interview",
          label,
          row.minute,
          "minutes",
          "stage",
          completed.stage + 1,
        );
        writeFileSync(
          path + "-progress.json",
          JSON.stringify(
            { timelineSimulated: true, quality, turns, diagram, calls },
            null,
            2,
          ),
        );
        if (
          row.minute >= 37 &&
          !/[?？]/u.test(completed.reply) &&
          /\bend (?:the |your |this )?interview\b/iu.test(completed.reply)
        )
          break;
      }
      return finishFullGenaiInterview({
        problem,
        sessionId: started.sessionId,
        checkpoint,
        epoch,
        scene,
        diagram,
        quality,
        label,
        path,
        turns,
        visited,
      });
    });
  } catch (cause) {
    writeFileSync(
      path + "-failure.json",
      JSON.stringify(
        {
          error: cause instanceof Error ? cause.message : "Unknown error",
          turns,
          calls: calls.filter((c) => c.label.startsWith(label + ":")),
        },
        null,
        2,
      ),
    );
    throw cause;
  } finally {
    writeFileSync(
      path + "-calls.json",
      JSON.stringify(
        calls.filter((c) => c.label.startsWith(label + ":")),
        null,
        2,
      ),
    );
    vi.useRealTimers();
    vi.unstubAllEnvs();
  }
}
