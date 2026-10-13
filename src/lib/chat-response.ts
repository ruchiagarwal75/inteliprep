import type { CompletedInterviewTurn } from "@/lib/interview-stream";

/** Stage state commits only after a complete, nonempty reply has been produced. */
export function chatResponse(
  deltas: AsyncGenerator<string>,
  first: IteratorResult<string>,
  headers: HeadersInit,
  onComplete: () => void,
  onRelease: () => void,
  onCancel: () => void,
  checkpoint?: () => CompletedInterviewTurn,
): Response {
  const encoder = new TextEncoder();
  let cancelled = false;
  const encodeDelta = (text: string) =>
    encoder.encode(
      checkpoint ? JSON.stringify({ type: "delta", text }) + "\n" : text,
    );
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";
      try {
        if (!first.done && first.value) {
          reply += first.value;
          controller.enqueue(encodeDelta(first.value));
        }
        for await (const delta of deltas) {
          reply += delta;
          if (!cancelled) controller.enqueue(encodeDelta(delta));
        }
        if (!reply.trim())
          throw new Error(
            "The interviewer returned an empty reply. Please try again.",
          );
        if (!cancelled) {
          onComplete();
          if (checkpoint)
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "complete", ...checkpoint() }) + "\n",
              ),
            );
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
