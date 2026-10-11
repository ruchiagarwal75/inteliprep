import { afterEach, describe, expect, it, vi } from "vitest";
import { chatResponse } from "@/lib/chat-response";

afterEach(() => vi.restoreAllMocks());
describe("completed reply stage commits", () => {
  it("commits exactly once after streaming a complete nonempty reply", async () => {
    async function* deltas() {
      yield "First ";
      yield "second";
    }
    const iterator = deltas(),
      complete = vi.fn(),
      release = vi.fn();
    const response = chatResponse(
      iterator,
      await iterator.next(),
      {},
      complete,
      release,
      vi.fn(),
    );
    expect(await response.text()).toBe("First second");
    expect(complete).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });
  it.each(["empty", "failed"])(
    "does not advance a stage after an %s reply",
    async (kind) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      async function* deltas() {
        yield "";
        if (kind === "failed") throw new Error("Interrupted");
      }
      const iterator = deltas(),
        complete = vi.fn(),
        release = vi.fn();
      const response = chatResponse(
        iterator,
        await iterator.next(),
        {},
        complete,
        release,
        vi.fn(),
      );
      await expect(response.text()).rejects.toThrow();
      expect(complete).not.toHaveBeenCalled();
      expect(release).toHaveBeenCalledOnce();
    },
  );
  it("cancels the provider, releases the turn, and keeps the stage on disconnect", async () => {
    let finish: (() => void) | undefined;
    async function* deltas() {
      yield "First";
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      yield "Second";
    }
    const iterator = deltas(),
      complete = vi.fn(),
      release = vi.fn(),
      cancel = vi.fn();
    const response = chatResponse(
      iterator,
      await iterator.next(),
      {},
      complete,
      release,
      cancel,
    );
    const reader = response.body?.getReader();
    await reader?.read();
    await reader?.cancel();
    finish?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cancel).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
  });
});
