import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  limit: vi.fn(),
  track: vi.fn(),
}));
vi.mock("@/lib/candidate-auth", () => ({ candidateIdentity: mocks.identity }));
vi.mock("@/lib/request-limits", () => ({ checkRequestLimit: mocks.limit }));
vi.mock("@/lib/viewer-tracking", () => ({ trackAppViewer: mocks.track }));
vi.mock("@/lib/reporting-write", () => ({
  deferReporting: (fn: () => Promise<unknown>) => void fn(),
}));
vi.mock("@/lib/server-events", () => ({
  logServerEvent: () => {},
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
afterEach(() => vi.resetAllMocks());
it("accepts an anonymous first visit and derives the optional account identity on the server", async () => {
  expect((await POST(request())).status).toBe(204);
  expect(mocks.track).toHaveBeenCalledWith(id, undefined, false);
  mocks.identity.mockResolvedValue("99999999-9999-4999-8999-999999999999");
  await POST(request());
  expect(mocks.track).toHaveBeenLastCalledWith(
    id,
    "99999999-9999-4999-8999-999999999999",
    false,
  );
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
