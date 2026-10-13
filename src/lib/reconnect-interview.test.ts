import { afterEach, describe, expect, it, vi } from "vitest";
import { reconnectInterview } from "@/lib/reconnect-interview";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import {
  createInterviewTiming,
  remainingInterviewSeconds,
} from "@/lib/interview-timer";

afterEach(() => vi.unstubAllGlobals());
describe("reopening browser interviews", () => {
  it("displays completed feedback offline without contacting the server or model", async () => {
    const saved = {
      ...savedFixture(),
      hasEnded: true,
      scorecard: scorecardFixture(),
    };
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await reconnectInterview(saved)).toBe(saved);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses the actual server stage/checkpoint while preserving all local drawing and transcript data", async () => {
    const saved = savedFixture();
    const phase = {
      ...saved.phase,
      position: 2,
      id: "drawing",
      title: "Draw and explain",
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ phase, resumeToken: "new-token", ended: false }),
      );
    vi.stubGlobal("fetch", fetcher);
    const restored = await reconnectInterview(saved);
    expect(restored.phase).toEqual(phase);
    expect(restored.interview.resumeToken).toBe("new-token");
    expect(restored.whiteboard).toBe(saved.whiteboard);
    expect(restored.messages).toBe(saved.messages);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).sessionId).toBe(saved.id);
  });
  it("keeps a locally frozen ending frozen even if the response was lost before the server received it", async () => {
    const saved = { ...savedFixture(), hasEnded: true };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          phase: saved.phase,
          resumeToken: "token",
          ended: false,
        }),
      ),
    );
    expect((await reconnectInterview(saved)).hasEnded).toBe(true);
  });
  it("reports reconnect failures without changing the saved browser copy", async () => {
    const saved = savedFixture(),
      snapshot = structuredClone(saved);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Saved checkpoint is invalid" },
            { status: 409 },
          ),
        ),
    );
    await expect(reconnectInterview(saved)).rejects.toThrow(
      "Saved checkpoint is invalid",
    );
    expect(saved).toEqual(snapshot);
  });
  it("restores an expired deadline without granting another interview duration", async () => {
    const saved = savedFixture();
    const serverNow = Date.now();
    const timing = createInterviewTiming(1, serverNow - 120_000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          phase: saved.phase,
          resumeToken: "token",
          ended: false,
          timing,
          serverTime: new Date(serverNow).toISOString(),
        }),
      ),
    );
    const restored = await reconnectInterview(saved);
    expect(restored.interview.timing).toEqual(timing);
    expect(
      remainingInterviewSeconds(
        restored.interview.timing,
        Date.now() + restored.clockOffsetMs,
      ),
    ).toBe(0);
    expect(restored.hasEnded).toBe(false);
  });
});
