import type { CompletedInterviewTurn } from "@/lib/interview-stream";
import { logServerEvent } from "@/lib/server-events";

/** Stage state commits only after a complete, nonempty reply has been produced. */
export function chatResponse(
  deltas: AsyncGenerator<string>,
  first: IteratorResult<string>,
  headers: HeadersInit,
  onComplete: (reply: string) => void | Promise<void>,
  onRelease: () => void | Promise<void>,
  onCancel: () => void,
  checkpoint?: () => CompletedInterviewTurn,
  requestId?: string,
): Response {
  const encoder = new TextEncoder();
  let cancelled = false;
  let released: Promise<void> | undefined;
  const release = () => (released ??= Promise.resolve(onRelease()));
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
          await onComplete(reply);
          if (cancelled) return;
          const completed = checkpoint?.();
          // The next request must be able to acquire the lock as soon as EOF arrives.
          await release();
          if (cancelled) return;
          if (completed)
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "complete", ...completed }) + "\n",
              ),
            );
          controller.close();
        }
      } catch (cause) {
        if (!cancelled) {
          logServerEvent(
            { event: "chat_stream_failure", route: "/api/chat", requestId },
            cause,
          );
          controller.error(cause);
        }
      } finally {
        await release();
      }
    },
    cancel() {
      cancelled = true;
      onCancel();
      return release();
    },
  });
  return new Response(stream, { headers });
}
