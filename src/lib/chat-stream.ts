import type { Scene } from "@/lib/scene";

/** Commit exactly the sent scene only after a complete, nonempty reply. */
export async function receiveChatTurn(
  body: ReadableStream<Uint8Array>,
  sentScene: Scene,
  onDelta: (chunk: string) => void,
  onComplete: (scene: Scene) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let reply = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) {
        reply += text;
        onDelta(text);
      }
    }
    const tail = decoder.decode();
    if (tail) {
      reply += tail;
      onDelta(tail);
    }
    if (!reply.trim())
      throw new Error(
        "The interviewer returned an empty reply. Please try again.",
      );
    onComplete(sentScene);
  } finally {
    reader.releaseLock();
  }
}
