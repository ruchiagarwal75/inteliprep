import { afterEach, expect, it, vi } from "vitest";
import {
  withRoundTiming,
  roundGuardComplete,
  recordRoundTime,
  roundTimingPath,
} from "./round-timing";
const log = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server-events", () => ({ logServerEvent: log }));
afterEach(() => {
  vi.restoreAllMocks();
  log.mockReset();
});
it("exposes fixed timing phases without logging response bodies or answers", async () => {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const response = await withRoundTiming(async () => {
    now = 10;
    roundGuardComplete();
    roundTimingPath("fresh");
    recordRoundTime("dbAcquireMs", 3);
    recordRoundTime("dbLockMs", 2);
    recordRoundTime("dbWorkMs", 8);
    recordRoundTime("dbFinishMs", 2);
    now = 30;
    return Response.json(
      { answer: "never log this" },
      { headers: { "X-Request-Id": "round-timing-fixture" } },
    );
  });
  expect(response.headers.get("Server-Timing")).toContain("guardMs;dur=10.0");
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      event: "play_round_timing",
      requestId: "round-timing-fixture",
      roundPath: "fresh",
      guardMs: 10,
      dbAcquireMs: 3,
      dbLockMs: 2,
      dbWorkMs: 8,
      dbFinishMs: 2,
      durationMs: 30,
    }),
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain("never log this");
});
it("keeps concurrent round spans separate and leaves other requests alone", async () => {
  recordRoundTime("dbWorkMs", 9999);
  const responses = await Promise.all(
    ["fresh", "resume"].map(async (path) =>
      withRoundTiming(async () => {
        roundTimingPath(path === "fresh" ? "fresh" : "resume");
        await Promise.resolve();
        recordRoundTime("dbWorkMs", path === "fresh" ? 12 : 25);
        return new Response("ok");
      }),
    ),
  );
  expect(responses[0].headers.get("Server-Timing")).toContain(
    "dbWorkMs;dur=12.0",
  );
  expect(responses[1].headers.get("Server-Timing")).toContain(
    "dbWorkMs;dur=25.0",
  );
});
