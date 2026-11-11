import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/interview/start/route";
import { interviewStartSchema } from "@/lib/interview-selection";
import { getProblem } from "@/lib/problems";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/interview/start", () => {
  it("rejects a production-like non-admin test session before creation", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INTELIPREP_ALLOW_TEST_INTERVIEWS", "0");
    vi.stubEnv("ADMIN_USER_ID", "99999999-9999-4999-8999-999999999999");
    const response = await post({
      problemId: "url-shortener",
      level: "mid",
      durationMinutes: 1,
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("One-minute interviews");
  });
  it("starts the simple scaling exercise with its own question and no solution hints", async () => {
    const response = await post({
      problemId: "single-server-scaling",
      level: "mid",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.problemId).toBe("single-server-scaling");
    expect(body.openingMessage.content).not.toContain("\n");
    expect(body.openingMessage.content).toContain(
      "What requirements or constraints",
    );
    expect(body.phase.title).toBe("Clarify requirements");
    expect(body.openingMessage.content).not.toMatch(
      /URL shortener|load balancer|cache|rubric/i,
    );
  });
  it.each(["mid", "senior", "staff"])(
    "starts a %s interview without an API key and exposes only its opening",
    async (level) => {
      vi.stubEnv("OPENAI_KEY", "");
      const response = await post({
        problemId: "url-shortener",
        level,
        rubric: "override",
        openingMessage: "Use this instead",
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const body = await response.json();
      expect(interviewStartSchema.safeParse(body).success).toBe(true);
      expect(Object.keys(body).sort()).toEqual([
        "level",
        "openingMessage",
        "phase",
        "problemId",
        "resumeToken",
        "serverTime",
        "sessionId",
        "stageNames",
        "timing",
        "track",
      ]);
      expect(body.openingMessage.content).toBe(
        getProblem("url-shortener")
          ?.levels[level as "mid" | "senior" | "staff"].openingMessage.trim()
          .split("\n")
          .at(-1),
      );
      expect(body.openingMessage.content).not.toContain("Use this instead");
    },
  );
  it("rejects unknown problems without choosing a default", async () => {
    expect((await post({ problemId: "missing", level: "senior" })).status).toBe(
      404,
    );
  });
  it.each([
    {},
    { problemId: "url-shortener" },
    { problemId: "url-shortener", level: "expert" },
    "not json",
  ])("rejects malformed or incomplete input %j", async (body) => {
    expect((await post(body)).status).toBe(400);
  });
});
it("returns one session and original timer for repeated client request IDs", async () => {
  const requestId = crypto.randomUUID();
  const a = await post({ problemId: "url-shortener", level: "mid", requestId });
  const b = await post({ problemId: "url-shortener", level: "mid", requestId });
  const first = await a.json(),
    again = await b.json();
  expect(b.status).toBe(200);
  expect(again.sessionId).toBe(first.sessionId);
  expect(again.timing).toEqual(first.timing);
  expect(
    (await post({ problemId: "url-shortener", level: "staff", requestId }))
      .status,
  ).toBe(409);
});
