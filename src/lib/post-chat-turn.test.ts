import { describe, expect, it, vi } from "vitest";
import { postChatTurn, INTERVIEWER_UNAVAILABLE } from "@/lib/post-chat-turn";
import type { ChatRequest } from "@/lib/chat";
import { InterviewRateLimitError } from "@/lib/retry-after";
import { InterviewSyncError } from "@/lib/interview-sync";
import {
  CANDIDATE_AUTH_ERROR_HEADER,
  CANDIDATE_AUTH_REQUIRED,
} from "@/lib/candidate-api-error";

const payload: ChatRequest = {
  problemId: "single-server-scaling",
  level: "mid",
  messages: [{ role: "user", content: "I would measure CPU." }],
};
const phase = {
  id: "draw-and-explain",
  title: "Draw and explain",
  position: 2,
  total: 5,
};
const frame = (value: unknown) => JSON.stringify(value) + "\n";
const delta = frame({ type: "delta", text: "Reply" });
const complete = frame({ type: "complete", phase, resumeToken: "checkpoint" });

describe("chat transport recovery", () => {
  it("preserves the Retry-After wait for the browser countdown", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: "Please wait" },
          { status: 429, headers: { "Retry-After": "15" } },
        ),
      );
    const failure = await postChatTurn(
      request,
      payload,
      vi.fn(),
      vi.fn(),
    ).catch((cause: unknown) => cause);
    expect(failure).toBeInstanceOf(InterviewRateLimitError);
    expect(failure).toMatchObject({
      message: "Too many requests. Try again in 15 seconds.",
      retryAt: expect.any(Number),
    });
    expect(request).toHaveBeenCalledOnce();
  });
  it("distinguishes a stale transcript from a busy interview", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { code: "INTERVIEW_TRANSCRIPT_CHANGED", error: "Reopen" },
          { status: 409 },
        ),
      );
    await expect(
      postChatTurn(request, payload, vi.fn(), vi.fn()),
    ).rejects.toBeInstanceOf(InterviewSyncError);
  });
  it.each([401, 403, 503])(
    "keeps an upstream failure visible as interviewer unavailability (%s)",
    async (status) => {
      const request = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            error: INTERVIEWER_UNAVAILABLE,
            code: "expired_secret_key",
          },
          { status },
        ),
      );
      const started = vi.fn(),
        chunk = vi.fn();
      await expect(
        postChatTurn(request, payload, started, chunk),
      ).rejects.toThrow(INTERVIEWER_UNAVAILABLE);
      expect(started).not.toHaveBeenCalled();
      expect(chunk).not.toHaveBeenCalled();
    },
  );
  it("preserves an explicitly marked app-login error", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: "Please sign in to continue your interview.",
        },
        {
          status: 401,
          headers: { [CANDIDATE_AUTH_ERROR_HEADER]: CANDIDATE_AUTH_REQUIRED },
        },
      ),
    );
    await expect(
      postChatTurn(request, payload, vi.fn(), vi.fn()),
    ).rejects.toThrow("Please sign in");
  });
  it("handles a rejected request or a non-JSON service outage", async () => {
    for (const request of [
      vi.fn<typeof fetch>().mockRejectedValue(new Error("Connection lost")),
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("Gateway down", { status: 503 })),
    ])
      await expect(
        postChatTurn(request, payload, vi.fn(), vi.fn()),
      ).rejects.toThrow(INTERVIEWER_UNAVAILABLE);
  });
  it("requires a completed stream and checkpoint before accepting a reply", async () => {
    for (const body of [
      delta,
      complete,
      delta + frame({ type: "complete", phase }),
      delta + frame({ type: "complete", resumeToken: "checkpoint" }),
    ]) {
      const request = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(body));
      await expect(
        postChatTurn(request, payload, vi.fn(), vi.fn()),
      ).rejects.toThrow("interrupted");
    }
    const chunk = vi.fn();
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(delta + complete));
    expect(await postChatTurn(request, payload, vi.fn(), chunk)).toEqual({
      reply: "Reply",
      phase,
      resumeToken: "checkpoint",
      listening: false,
    });
    expect(chunk).toHaveBeenCalledWith("Reply");
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({
      problemId: payload.problemId,
      level: payload.level,
      message: payload.messages[0],
      afterMessageCount: 0,
    });
    expect(
      JSON.parse(String(request.mock.calls[0][1]?.body)),
    ).not.toHaveProperty("messages");
  });
  it("keeps completed quiet listening out of the transcript", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        delta +
          frame({
            type: "complete",
            phase,
            resumeToken: "checkpoint",
            replyKind: "listening",
          }),
        { headers: { "X-Interview-Reply-Kind": "listening" } },
      ),
    );
    const chunk = vi.fn();
    expect(
      (await postChatTurn(request, payload, vi.fn(), chunk)).listening,
    ).toBe(true);
    expect(chunk).not.toHaveBeenCalled();
  });
});
