import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fixtureSchema, fixtureScene } from "./genai-fixture";
import { calls, metered } from "./model-meter";
import { getProblem } from "@/lib/problems";
import { streamInterviewerReply } from "@/lib/llm";
import { compareSeniorDesigns } from "./genai-grading";
import { questionAtEnd } from "@/lib/open-question";
import { questionMemory } from "@/lib/question-memory";
import { graphToText } from "@/lib/scene-to-text";
import { sceneToGraph } from "@/lib/scene-graph";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewContext } from "@/lib/interview-instructions";

// Meter real calls; this wrapper never replaces provider replies with fixtures.
vi.mock("@/lib/observed-model-request", async () => import("./observed-live"));
const fixtures = readdirSync("tests/fixtures/genai")
  .filter((f) => f.endsWith(".json"))
  .map((f) =>
    fixtureSchema.parse(
      JSON.parse(readFileSync(`tests/fixtures/genai/${f}`, "utf8")),
    ),
  );
console.info(
  "GenAI live fixtures loaded",
  fixtures.map((f) => f.problemId),
);
const root = "artifacts/genai";
mkdirSync(root, { recursive: true });
afterAll(() =>
  writeFileSync(
    `${root}/usage-${Date.now()}.json`,
    JSON.stringify(calls, null, 2),
  ),
);

describe.each(fixtures)("Real model $problemId", (fixture) => {
  const problem = getProblem(fixture.problemId);
  if (!problem?.genai) throw new Error("Missing GenAI problem");
  const config = problem.genai;
  for (const level of fixture.levels) {
    it(`interviews ${level} with private facts, estimates and design-specific probes`, async () => {
      const label = `${problem.id}-${level}`;
      const messages: ChatMessage[] = [
        {
          role: "assistant",
          content: "What would you clarify before starting your design?",
        },
      ];
      const replies: {
        input: string;
        reply: string;
        stage: number;
        durationMs: number;
        area?: number;
      }[] = [];
      const memory = {
        askedQuestions: [] as string[],
        coveredTopics: [] as string[],
        topicTurns: {} as Record<string, number>,
      };
      const scene = fixtureScene(fixture.strongNodes, fixture.strongEdges);
      const diagram = graphToText(sceneToGraph(scene));
      const turn = async (input: string, stage: number) => {
        console.info("GenAI turn", label, stage, replies.length + 1);
        messages.push({ role: "user", content: input });
        const context: InterviewContext = {
          problem,
          level,
          phase: problem.phases[stage],
          progress: {
            step: stage === 0 ? "discussion" : "review",
            candidateTurns: messages.filter((m) => m.role === "user").length,
            discussionTurnLimit: 99,
          },
          mayInviteDrawing: false,
          questionMemory: {
            ...memory,
            askedQuestions: questionMemory(messages).askedQuestions,
          },
          designText:
            messages
              .filter((m) => m.role === "user")
              .map((m) => m.content)
              .join(" ") +
            " " +
            fixture.strongNodes.join(" "),
          diagramLabels: stage === 0 ? [] : fixture.strongNodes,
        };
        const started = Date.now();
        const reply = await metered(label, async () => {
          let text = "";
          for await (const delta of streamInterviewerReply(
            messages,
            stage === 0 ? "The current whiteboard is empty." : diagram,
            "No changes.",
            AbortSignal.timeout(60000),
            undefined,
            context,
          ))
            text += delta;
          return text;
        });
        messages.push({ role: "assistant", content: reply });
        replies.push({
          input,
          reply,
          stage,
          durationMs: Date.now() - started,
          area: problem.reviewProbes.find(
            (p) => p.topic === context.selectedTopic,
          )?.areaIndex,
        });
        if (context.selectedTopic)
          memory.topicTurns[context.selectedTopic] =
            (memory.topicTurns[context.selectedTopic] ?? 0) + 1;
        writeFileSync(
          `${root}/${label}-interview.json`,
          JSON.stringify(
            {
              messages,
              replies,
              calls: calls.filter((c) => c.label === label),
            },
            null,
            2,
          ),
        );
        return reply;
      };
      const selected = fixture.facts.slice(0, 3);
      const combined = await turn(selected.map((f) => f.ask).join(" "), 0);
      const first = config.facts.find((f) => f.id === selected[0].id);
      expect(combined).toContain(first?.answers[level]);
      for (const row of selected) {
        const fact = config.facts.find((f) => f.id === row.id);
        expect(combined).toContain(fact?.answers[level]);
      }
      const noNewFacts = await turn("What else should I know?", 0);
      expect(noNewFacts).not.toMatch(/isn't specified|not specified/iu);
      expect(noNewFacts).toMatch(/what.*know|requirement/iu);
      for (const fact of config.facts.filter(
        (f) => !selected.some((row) => row.id === f.id),
      ))
        expect(noNewFacts.replaceAll('"', "")).not.toContain(
          fact.answers[level],
        );
      for (const fact of fixture.facts.slice(1)) {
        const reply = await turn(fact.ask, 0);
        // The shared label grammar guard may quote a matching diagram name.
        expect(reply.replaceAll('"', "")).toContain(
          config.facts.find((f) => f.id === fact.id)?.answers[level],
        );
      }
      for (const wrong of fixture.wrongEstimates.filter(
        (row) => row.level === level,
      )) {
        const reply = await turn(wrong.text, 0);
        expect(reply).toMatch(
          /redo|walk.*(?:math|calculation)|revisit|recalculate|check.*(?:math|units)/iu,
        );
        expect(reply).not.toMatch(/about 150 GB|1,?700 GPUs|50M tokens/iu);
        await turn(
          level === "mid" && problem.id === "ai-chat-assistant"
            ? "I redid the units: 10M messages times 2,400 tokens is 24B tokens daily, about 16.7M per minute average and 50M at the three-times peak. That exceeds 40M per minute, so I need a bounded overload plan as well as the request limit."
            : fixture.strong[0],
          0,
        );
      }
      // The requested extra Mid chat case tests the provider token-limit math;
      // the full chat design/failure/evaluation/safety flow is tested at Senior.
      if (problem.id === "ai-chat-assistant" && level === "mid") return;
      for (const row of fixture.responses) await turn(row.text, row.stage);
      const discussion = replies
        .filter((r) => r.stage > 0)
        .map((r) => questionAtEnd(r.reply) ?? "")
        .join("\n");
      for (const area of ["Evaluation and quality", "Safety and security"])
        expect(
          replies.some(
            (r) =>
              r.stage > 0 &&
              r.area === problem.rubric.findIndex((a) => a.area === area),
          ),
          area,
        ).toBe(true);
      // Keep the scenario sentence: "A GPU dies. What does the user see?"
      // loses its failure context if reduced to just the final question.
      const fullDiscussion = replies
        .filter((r) => r.stage > 0)
        .map((r) => r.reply)
        .join("\n");
      for (const pattern of fixture.failureChecks)
        expect(fullDiscussion).toMatch(new RegExp(pattern, "iu"));
      expect(discussion).not.toMatch(
        /I see (?:a component|components labeled)/iu,
      );
    });
  }
  it("grades the weak Senior design below the strong one and names demonstrated red flags", () =>
    compareSeniorDesigns(fixture, problem, root));
});
