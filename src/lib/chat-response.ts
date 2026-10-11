/** Stage state commits only after a complete, nonempty reply has been produced. */
export function chatResponse(
  deltas: AsyncGenerator<string>,
  first: IteratorResult<string>,
  headers: HeadersInit,
  onComplete: () => void,
  onRelease: () => void,
  onCancel: () => void,
): Response {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";
      try {
        if (!first.done && first.value) {
          reply += first.value;
          controller.enqueue(encoder.encode(first.value));
        }
        for await (const delta of deltas) {
          reply += delta;
          if (!cancelled) controller.enqueue(encoder.encode(delta));
        }
        if (!reply.trim())
          throw new Error(
            "The interviewer returned an empty reply. Please try again.",
          );
        if (!cancelled) {
          onComplete();
          controller.close();
        }
      } catch (cause) {
        if (!cancelled) {
          console.error("chat stream interrupted", cause);
          controller.error(cause);
        }
      } finally {
        onRelease();
      }
    },
    cancel() {
      cancelled = true;
      onCancel();
      onRelease();
    },
  });
  return new Response(stream, { headers });
}
