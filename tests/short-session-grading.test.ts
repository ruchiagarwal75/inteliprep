import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST as start } from "@/app/api/interview/start/route";
import { POST as end } from "@/app/api/interview/end/route";
const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/openai-client", () => ({
  createOpenAIClient: () => ({ responses: { create: mock.create } }),
  interviewerModel: () => "test-model",
}));
const request = (body: unknown) =>
  new Request("http://localhost/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.useFakeTimers();
  mock.create.mockReset();
});
afterEach(() => vi.useRealTimers());
it.each([
  { durationMinutes: 45, elapsed: 300, reason: "too_short" },
  { durationMinutes: 60, elapsed: 900, reason: "too_short" },
  { durationMinutes: 45, elapsed: 1000, reason: "insufficient_stages" },
])(
  "does not call OpenAI for an ineligible $durationMinutes minute session",
  async ({ durationMinutes, elapsed, reason }) => {
    const started = await (
      await start(
        request({
          problemId: "url-shortener",
          level: "senior",
          durationMinutes,
        }),
      )
    ).json();
    vi.advanceTimersByTime(elapsed * 1000);
    const body = {
      problemId: started.problemId,
      level: started.level,
      sessionId: started.sessionId,
      resumeToken: started.resumeToken,
      messages: [
        started.openingMessage,
        {
          role: "user",
          content:
            "I would use a durable mapping from unique short identifiers to URLs, and check the mapping in the database on reads.",
        },
      ],
    };
    const response = await end(request(body));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.scorecard.notScoredReason).toBe(reason);
    expect(mock.create).not.toHaveBeenCalled();
    expect(
      result.scorecard.areas.every(
        (area: { score: number | null; evidence: unknown[] }) =>
          area.score === null && area.evidence.length === 0,
      ),
    ).toBe(true);
    const retry = await end(request(body));
    expect((await retry.json()).scorecard).toEqual(result.scorecard);
    expect(mock.create).not.toHaveBeenCalled();
  },
);
