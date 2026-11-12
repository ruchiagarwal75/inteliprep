import { expect, it, vi } from "vitest";
import { primeRound, peekRound, forgetRound } from "./round-prefetch";
import { roundViewSchema } from "@/lib/play/public";
it("carries only an owner-scoped public view across navigation and expires it", () => {
  const now = new Date().toISOString(),
    sessionId = crypto.randomUUID();
  const view = roundViewSchema.parse({
    sessionId,
    mode: "level",
    status: "answering",
    question: {
      attemptId: crypto.randomUUID(),
      drillId: "test",
      topic: "rag",
      level: 1,
      type: "pick_probe",
      title: "Probe",
      prompt: "Ask a question",
      ordinal: 0,
      total: 5,
      startedAt: now,
      serverNow: now,
      sample: false,
    },
  });
  primeRound("owner", view);
  expect(peekRound("owner", sessionId)).toEqual(view);
  expect(peekRound("other", sessionId)).toBeUndefined();
  forgetRound("owner", sessionId);
  expect(peekRound("owner", sessionId)).toBeUndefined();
  primeRound("owner", view);
  const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61000);
  expect(peekRound("owner", sessionId)).toBeUndefined();
  clock.mockRestore();
});
