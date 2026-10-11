import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/interview/start/route";
import { interviewStartSchema } from "@/lib/interview-selection";

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
  it("starts the simple scaling exercise with its own question and no solution hints", async () => {
    const response = await post({
      problemId: "single-server-scaling",
      level: "mid",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.problemId).toBe("single-server-scaling");
    expect(body.openingMessage.content).toContain("one server");
    expect(body.openingMessage.content).toContain("What would you check first");
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
        "sessionId",
      ]);
      expect(body.openingMessage.content).toContain("URL shortener");
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
