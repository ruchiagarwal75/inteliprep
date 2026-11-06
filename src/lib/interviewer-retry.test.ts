import { APIError } from "openai";
import { afterEach, expect, it, vi } from "vitest";
import { retryInterviewerReply } from "@/lib/interviewer-retry";
afterEach(() => vi.useRealTimers());
const error = (status: number) =>
  new APIError(status, {}, "Provider failed", undefined);
async function read(
  generate: (signal: AbortSignal) => AsyncGenerator<string>,
  signal = new AbortController().signal,
) {
  let text = "";
  for await (const delta of retryInterviewerReply(generate, signal))
    text += delta;
  return text;
}
it("retries a transient failure once before any output", async () => {
  const generate = vi
    .fn()
    .mockImplementationOnce(async function* () {
      throw error(503);
      yield "";
    })
    .mockImplementationOnce(async function* () {
      yield "Recovered reply";
    });
  expect(await read(generate)).toBe("Recovered reply");
  expect(generate).toHaveBeenCalledTimes(2);
});
it.each([400, 401, 403, 429])(
  "does not automatically retry %s",
  async (status) => {
    const generate = vi.fn(async function* () {
      throw error(status);
      yield "";
    });
    await expect(read(generate)).rejects.toThrow();
    expect(generate).toHaveBeenCalledOnce();
  },
);
it("does not retry a partially delivered reply or a cancelled request", async () => {
  const generate = vi.fn(async function* () {
    yield "Partial";
    throw error(503);
  });
  await expect(read(generate)).rejects.toThrow();
  expect(generate).toHaveBeenCalledOnce();
  const abort = new AbortController();
  const cancelled = vi.fn(async function* () {
    abort.abort();
    throw error(503);
    yield "";
  });
  await expect(read(cancelled, abort.signal)).rejects.toThrow();
  expect(cancelled).toHaveBeenCalledOnce();
});
it("stops after the second failed attempt", async () => {
  const generate = vi.fn(async function* () {
    throw error(503);
    yield "";
  });
  await expect(read(generate)).rejects.toThrow();
  expect(generate).toHaveBeenCalledTimes(2);
});
