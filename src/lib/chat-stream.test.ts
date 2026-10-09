import { describe, expect, it, vi } from "vitest";
import basicScene from "@/lib/fixtures/basic-system.json";
import cacheElements from "@/lib/fixtures/cache-elements.json";
import { captureScene } from "@/lib/scene-snapshot";
import { receiveChatTurn } from "@/lib/chat-stream";

const encoder = new TextEncoder();
const sent = captureScene(basicScene.elements);

describe("receiveChatTurn", () => {
  it("decodes split Unicode and advances the baseline only after the stream completes", async () => {
    let close: (() => void) | undefined;
    const bytes = encoder.encode("API → Cache");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 5));
        controller.enqueue(bytes.slice(5));
        close = () => controller.close();
      },
    });
    const chunks: string[] = [];
    const onComplete = vi.fn();
    const done = receiveChatTurn(
      body,
      sent,
      (chunk) => chunks.push(chunk),
      onComplete,
    );
    await Promise.resolve();
    expect(onComplete).not.toHaveBeenCalled();
    close?.();
    await done;
    expect(chunks.join("")).toBe("API → Cache");
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(sent);
  });

  it("does not advance the baseline after a partial reply fails", async () => {
    let baseline = sent;
    const changed = captureScene([...basicScene.elements, ...cacheElements]);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("I see a cache"));
      },
      pull(controller) {
        controller.error(new Error("Connection lost"));
      },
    });
    await expect(
      receiveChatTurn(
        body,
        changed,
        () => {},
        (scene) => {
          baseline = scene;
        },
      ),
    ).rejects.toThrow("Connection lost");
    expect(baseline).toBe(sent);
  });

  it.each(["", "   "])(
    "does not advance the baseline for an empty reply: %j",
    async (text) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(text));
          controller.close();
        },
      });
      const complete = vi.fn();
      await expect(
        receiveChatTurn(body, sent, () => {}, complete),
      ).rejects.toThrow("empty reply");
      expect(complete).not.toHaveBeenCalled();
    },
  );

  it("commits the captured scene even when the candidate keeps drawing during the reply", async () => {
    let currentDrawing = sent;
    let baseline = sent;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("What happens next?"));
        controller.close();
      },
    });
    await receiveChatTurn(
      body,
      sent,
      () => {
        currentDrawing = captureScene([
          ...basicScene.elements,
          ...cacheElements,
        ]);
      },
      (scene) => {
        baseline = scene;
      },
    );
    expect(currentDrawing.elements.length).toBeGreaterThan(
      baseline.elements.length,
    );
    expect(baseline).toBe(sent);
  });
});
