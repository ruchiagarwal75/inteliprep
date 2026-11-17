import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  limit: vi.fn(),
  track: vi.fn(),
  log: vi.fn(),
}));
vi.mock("@/lib/candidate-auth", () => ({ candidateSession: mocks.identity }));
vi.mock("@/lib/request-limits", () => ({ checkRequestLimit: mocks.limit }));
vi.mock("@/lib/viewer-tracking", () => ({ trackAppViewer: mocks.track }));
vi.mock("@/lib/reporting-write", () => ({
  deferReporting: (fn: () => Promise<unknown>) => void fn(),
}));
vi.mock("@/lib/server-events", () => ({
  logServerEvent: mocks.log,
  withServerContext: (_id: string, _path: string, fn: () => unknown) => fn(),
}));
import { POST } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
function request(
  body: unknown = { visitorId: id },
  origin = "https://mockmeai.com",
) {
  return new Request("https://mockmeai.com/api/monitoring/viewer", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  mocks.identity.mockResolvedValue(undefined);
  mocks.limit.mockResolvedValue(0);
  mocks.track.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it.each(["vercel-screenshot/1.0", "HeadlessChrome/130.0.0.0", "Googlebot/2.1"])(
  "does not count known automated requests (%s)",
  async (agent) => {
    const input = request();
    input.headers.set("user-agent", agent);
    expect((await POST(input)).status).toBe(204);
    expect(mocks.track).not.toHaveBeenCalled();
    expect(mocks.identity).not.toHaveBeenCalled();
  },
);
it("accepts an anonymous first visit and derives the optional account identity on the server", async () => {
  expect((await POST(request())).status).toBe(204);
  expect(mocks.track).toHaveBeenCalledWith({
    visitorId: id,
    session: undefined,
    local: false,
    connection: undefined,
  });
  const session = {
    id: "99999999-9999-4999-8999-999999999999",
    kind: "account",
  };
  mocks.identity.mockResolvedValue(session);
  await POST(request());
  expect(mocks.track).toHaveBeenLastCalledWith({
    visitorId: id,
    session,
    local: false,
    connection: undefined,
  });
});
it("derives private connection metadata only from the platform, never client JSON", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VISITOR_IP_HASH_SECRET", "fixture-key-".repeat(4));
  const input = request();
  input.headers.set("x-vercel-forwarded-for", "192.0.2.7");
  input.headers.set("x-vercel-ip-country", "US");
  expect((await POST(input)).status).toBe(204);
  expect(mocks.track).toHaveBeenLastCalledWith({
    visitorId: id,
    session: undefined,
    local: false,
    connection: {
      hash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      rawIp: "192.0.2.7",
      countryCode: "US",
    },
  });
  expect(JSON.stringify(mocks.log.mock.calls)).not.toContain("192.0.2.7");
  mocks.track.mockClear();
  expect((await POST(request({ visitorId: id, ip: "192.0.2.7" }))).status).toBe(
    400,
  );
  expect(mocks.track).not.toHaveBeenCalled();
});
it("passes the verified guest identity without trusting a client-provided country or kind", async () => {
  const session = { id, kind: "guest" };
  mocks.identity.mockResolvedValue(session);
  const response = await POST(request());
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(mocks.track).toHaveBeenLastCalledWith({
    visitorId: id,
    session,
    local: false,
    connection: undefined,
  });
  for (const field of [
    { countryCode: "US" },
    { session },
    { rawIp: "192.0.2.7" },
  ])
    expect((await POST(request({ visitorId: id, ...field }))).status).toBe(400);
});
it("rejects smuggled account IDs, client timestamps and invalid identifiers", async () => {
  for (const body of [
    { visitorId: id, userId: id },
    { visitorId: id, firstSeen: "2000-01-01" },
    { visitorId: "made-up" },
  ])
    expect((await POST(request(body))).status).toBe(400);
  expect(mocks.track).not.toHaveBeenCalled();
});
it("rejects cross-origin writes and rate limits without recording a visit", async () => {
  expect((await POST(request(undefined, "https://other.example"))).status).toBe(
    403,
  );
  mocks.limit.mockResolvedValue(45);
  const result = await POST(request());
  expect(result.status).toBe(429);
  expect(result.headers.get("Retry-After")).toBe("45");
  expect(mocks.track).not.toHaveBeenCalled();
});

it("records which dependency failed without leaking its diagnostic message", async () => {
  const cause = new Error("private upstream details");
  mocks.identity.mockRejectedValueOnce(cause);
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private upstream");
  expect(mocks.log).toHaveBeenLastCalledWith(
    expect.objectContaining({ failureStage: "visitor_identity", status: 503 }),
    cause,
  );
});
