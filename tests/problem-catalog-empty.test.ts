import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST as startInterview } from "@/app/api/interview/start/route";
import { POST as endInterview } from "@/app/api/interview/end/route";
import { interviewStartSchema } from "@/lib/interview-selection";
import { interviewEndResponseSchema } from "@/lib/scorecard";
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
beforeEach(() => {
  vi.stubEnv("OPENAI_KEY", "catalog-test-key");
  mocks.create.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

it.each(problemReviews)(
  "ends an unexplained $problemId drawing without invented scores",
  async (example) => {
    const selection = { problemId: example.problemId, level: "mid" };
    const start = await startInterview(request(selection));
    const started = interviewStartSchema.parse(await start.json());
    const response = await endInterview(
      request({
        ...selection,
        sessionId: started.sessionId,
        messages: [
          started.openingMessage,
          {
            role: "user",
            content: "I've finished explaining.",
            source: "control",
          },
        ],
        scene: reviewScene(example),
      }),
    );
    expect(response.status).toBe(200);
    const { scorecard } = interviewEndResponseSchema.parse(
      await response.json(),
    );
    expect(
      scorecard.areas.every(
        (area) => area.score === null && !area.evidence.length,
      ),
    ).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  },
);
