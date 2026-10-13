import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "openai";
import { getProblem } from "@/lib/problems";
import { gradeInterview } from "@/lib/interview-grading";
import { PNG_FIXTURE } from "@/lib/fixtures/whiteboard-test";
import {
  gradingAssessmentFixture,
  gradingSnapshot,
  endedAtFixture,
} from "@/lib/fixtures/scorecard-test";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create: mocks.create } }),
  interviewerModel: () => "test-model",
}));
const selected = getProblem("single-server-scaling");
if (!selected) throw new Error("Missing problem");
const problem = selected;
const response = () => ({
  status: "completed",
  output_text: JSON.stringify(gradingAssessmentFixture()),
});
beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue(response());
});
afterEach(() => vi.unstubAllEnvs());

describe("separate end-of-interview grading", () => {
  it("returns insufficient evidence for an unexplained drawing even when the provider is unavailable", async () => {
    mocks.create.mockRejectedValue(new Error("Offline"));
    const card = await gradeInterview(
      problem,
      "mid",
      { ...gradingSnapshot, messages: [gradingSnapshot.messages[0]] },
      endedAtFixture,
    );
    expect(card.signal).toBe("insufficient_evidence");
    expect(card.summary).toContain("drawing was saved");
    expect(card.areas.every((area) => area.score === null)).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses the entire transcript, fixed private rubric and level, final diagram, and structured output", async () => {
    const scorecard = await gradeInterview(
      problem,
      "mid",
      gradingSnapshot,
      endedAtFixture,
    );
    expect(scorecard.signal).toBe("yes");
    const [request, options] = mocks.create.mock.calls[0];
    expect(request).toMatchObject({
      model: "test-model",
      temperature: 0,
      text: { format: { type: "json_schema" } },
    });
    const data = JSON.parse(request.input[0].content);
    expect(data.transcript).toEqual(
      gradingSnapshot.messages.map((message, index) => ({ ...message, index })),
    );
    expect(data.private_rubric[0].strong).toBe(problem.rubric[0].strong);
    expect(data.candidate_level).toBe("mid");
    expect(data.final_diagram).toContain("API");
    expect(options).toMatchObject({ maxRetries: 0, timeout: 45_000 });
  });
  it("includes the final screenshot even if it was unchanged on the last chat turn", async () => {
    await gradeInterview(
      problem,
      "mid",
      { ...gradingSnapshot, diagramImage: PNG_FIXTURE },
      endedAtFixture,
    );
    expect(mocks.create.mock.calls[0][0].input[0].content[1]).toEqual({
      type: "input_image",
      image_url: PNG_FIXTURE,
      detail: "high",
    });
  });
  it("does not use stage order or pacing actions as quality evidence", async () => {
    await gradeInterview(
      problem,
      "mid",
      {
        ...gradingSnapshot,
        messages: gradingSnapshot.messages.map((message) =>
          message.role === "user" ? { ...message, action: "draw" } : message,
        ),
      },
      endedAtFixture,
    );
    const request = mocks.create.mock.calls[0][0];
    expect(request.instructions).toContain("Do not grade stage order");
    const data = JSON.parse(request.input[0].content);
    expect(data).not.toHaveProperty("phaseIndex");
    expect(data.transcript[1]).not.toHaveProperty("action");
  });
  it("returns unassessed feedback without a provider call when there is no candidate evidence", async () => {
    const empty = await gradeInterview(
      problem,
      "mid",
      { messages: [gradingSnapshot.messages[0]], scene: { elements: [] } },
      endedAtFixture,
    );
    expect(empty.areas.every((area) => area.score === null)).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("retries an invalid rubric structure once and publishes only the verified result", async () => {
    const invalid = gradingAssessmentFixture();
    invalid.areas[0].areaIndex = invalid.areas[1].areaIndex;
    mocks.create.mockResolvedValueOnce({
      status: "completed",
      output_text: JSON.stringify(invalid),
    });
    expect(
      (await gradeInterview(problem, "mid", gradingSnapshot, endedAtFixture))
        .signal,
    ).toBe("yes");
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[1][0].instructions).toContain(
      "previous assessment failed validation",
    );
  });
  it("returns partial feedback on the first try when short-session scores lack evidence", async () => {
    const assessment = gradingAssessmentFixture();
    assessment.areas[2].evidence = [];
    assessment.areas[4].evidence = [{ kind: "message", quoteId: "invented" }];
    mocks.create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify(assessment),
    });
    const card = await gradeInterview(
      problem,
      "mid",
      gradingSnapshot,
      endedAtFixture,
    );
    expect(card.signal).toBe("insufficient_evidence");
    expect(card.areas[0].score).toBe(3);
    expect(card.areas[2].score).toBeNull();
    expect(card.areas[4].score).toBeNull();
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("does not invoke grading for either current or legacy button-only transcripts", async () => {
    for (const source of [undefined, "control"] as const) {
      const card = await gradeInterview(
        problem,
        "mid",
        {
          ...gradingSnapshot,
          messages: [
            gradingSnapshot.messages[0],
            {
              role: "user",
              content: "I've finished explaining. Let's discuss my design.",
              action: "review",
              ...(source ? { source } : {}),
            },
          ],
        },
        endedAtFixture,
      );
      expect(card.areas.every((area) => area.score === null)).toBe(true);
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    { status: "completed", output_text: "not JSON" },
    {
      status: "incomplete",
      output_text: JSON.stringify(gradingAssessmentFixture()),
    },
  ])(
    "never publishes repeatedly invalid or incomplete responses",
    async (invalid) => {
      mocks.create.mockResolvedValue(invalid);
      await expect(
        gradeInterview(problem, "mid", gradingSnapshot, endedAtFixture),
      ).rejects.toThrow();
      expect(mocks.create).toHaveBeenCalledTimes(2);
    },
  );
  it("does not repeat rejected provider requests", async () => {
    const rejected = new APIError(401, {}, "Unauthorized", new Headers());
    mocks.create.mockRejectedValue(rejected);
    await expect(
      gradeInterview(problem, "mid", gradingSnapshot, endedAtFixture),
    ).rejects.toBe(rejected);
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("forwards cancellation and does not call the provider after an abort", async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(
      gradeInterview(
        problem,
        "mid",
        gradingSnapshot,
        endedAtFixture,
        abort.signal,
      ),
    ).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
