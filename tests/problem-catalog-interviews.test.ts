import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/chat";
import { POST as startInterview } from "@/app/api/interview/start/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as endInterview } from "@/app/api/interview/end/route";
import { getProblem } from "@/lib/problems";
import {
  interviewLevelSchema,
  interviewStartSchema,
} from "@/lib/interview-selection";
import { readInterviewPhase } from "@/lib/interview-phase";
import { interviewEndResponseSchema } from "@/lib/scorecard";
import { candidateQuotes } from "@/lib/scorecard-quotes";
import { problemReviews, reviewScene } from "@/lib/fixtures/problem-reviews";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  APIError: class extends Error {},
  default: class {
    responses = { create: mocks.create };
  },
}));
const request = (body: unknown) =>
  new Request("http://localhost/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
async function* reply() {
  yield {
    type: "response.output_text.delta",
    delta: "Thanks for discussing your design.",
  };
  yield { type: "response.completed" };
}
beforeEach(() => {
  vi.stubEnv("OPENAI_KEY", "catalog-test-key");
  mocks.create
    .mockReset()
    .mockImplementation(async (input: { stream?: boolean }) => {
      if (!input.stream) throw new Error("Unexpected unscripted assessment");
      return reply();
    });
});
afterEach(() => vi.unstubAllEnvs());

describe("new catalog interview wiring with scripted provider responses", () => {
  it.each(
    problemReviews.flatMap((example) =>
      interviewLevelSchema.options.map((level) => ({ ...example, level })),
    ),
  )(
    "runs $problemId through all stages and grading at $level",
    async (example) => {
      const selection = { problemId: example.problemId, level: example.level };
      const problem = getProblem(selection.problemId);
      if (!problem) throw new Error("Missing problem");
      const startResponse = await startInterview(request(selection));
      expect(startResponse.status).toBe(200);
      const started = interviewStartSchema.parse(await startResponse.json());
      const messages: ChatMessage[] = [started.openingMessage];
      const scene = reviewScene(example);
      let drawing = false;
      const send = async (message: Omit<ChatMessage, "role">) => {
        messages.push({ role: "user", ...message });
        const response = await chat(
          request({
            ...selection,
            sessionId: started.sessionId,
            messages,
            scene: drawing ? scene : { elements: [] },
          }),
        );
        expect(response.status).toBe(200);
        const phase = readInterviewPhase(response.headers);
        const content = await response.text();
        messages.push({ role: "assistant", content });
        return { phase, content };
      };
      const goals = await send({ content: example.goalsQuestion });
      expect(goals.phase?.position).toBe(
        example.problemId === "news-feed" ? 2 : 1,
      );
      const clarified = await send({ content: example.constraintsQuestion });
      expect(clarified.phase?.position).toBe(2);
      expect(
        example.problemId === "news-feed" ? goals.content : clarified.content,
      ).toContain(problem.drawingPolicy.invitation);
      expect(mocks.create).not.toHaveBeenCalled();
      drawing = true;
      expect(
        (
          await send({
            content: "I'm ready to explain my design.",
            action: "explain",
            source: "control",
          })
        ).phase?.position,
      ).toBe(2);
      expect(
        (
          await send({
            content: example.coreExplanation.join(" "),
            action: "explain",
          })
        ).phase?.position,
      ).toBe(2);
      expect(mocks.create).not.toHaveBeenCalled();
      expect(
        (
          await send({
            content: "I've finished explaining. Let's discuss my design.",
            action: "review",
            source: "control",
          })
        ).phase?.position,
      ).toBe(3);
      for (const [position, excerpts] of [
        [4, example.coreExplanation],
        [5, example.validationExplanation],
      ] as const) {
        const messageIndex = messages.length;
        mocks.create.mockResolvedValueOnce({
          status: "completed",
          output_text: JSON.stringify({
            criteria: excerpts.map((quote, criterionIndex) => ({
              criterionIndex,
              met: true,
              messageIndex,
              quote,
            })),
          }),
        });
        const turn = await send({
          content:
            position === 4
              ? example.requirementsAnswer + " " + excerpts.join(" ")
              : excerpts.join(" "),
          action: "review",
        });
        expect(turn.phase?.position).toBe(position);
      }
      const quotes = candidateQuotes(messages);
      mocks.create.mockResolvedValueOnce({
        status: "completed",
        output_text: JSON.stringify({
          summary:
            "A scripted assessment verifies the new problem's grading wiring.",
          signal: "yes",
          areas: example.rubricEvidence.map((anchor, areaIndex) => {
            const quote = quotes.find((item) => item.quote.startsWith(anchor));
            if (!quote) throw new Error("Missing review evidence");
            return {
              areaIndex,
              score: 3,
              rationale: "Scripted wiring fixture.",
              evidence: [{ kind: "message", quoteId: quote.quoteId }],
            };
          }),
          strengths: [],
          gaps: [],
          nextProblemId: "url-shortener",
          practiceFocus:
            "Compare correctness guarantees across different exercises.",
        }),
      });
      const ending = {
        ...selection,
        sessionId: started.sessionId,
        messages,
        scene,
      };
      const response = await endInterview(request(ending));
      expect(response.status).toBe(200);
      const result = interviewEndResponseSchema.parse(await response.json());
      expect(result.scorecard.problemId).toBe(example.problemId);
      expect(result.scorecard.areas.map((area) => area.area)).toEqual(
        problem.rubric.map((area) => area.area),
      );
      expect(
        result.scorecard.areas.every(
          (area) => area.score === 3 && area.evidence.length,
        ),
      ).toBe(true);
      expect(result.scorecard.session?.limited).toBe(true);
      expect(result.scorecard.signal).toBe("insufficient_evidence");
      expect(JSON.stringify(result)).not.toContain(problem.rubric[0].strong);
      const calls = mocks.create.mock.calls.length;
      const repeated = await endInterview(request(ending));
      expect(repeated.status).toBe(200);
      expect((await repeated.json()).scorecard).toEqual(result.scorecard);
      expect(mocks.create.mock.calls).toHaveLength(calls);
    },
  );
});
