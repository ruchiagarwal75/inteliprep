import type { GradingProgressListener } from "@/lib/grading-progress";
import { logServerEvent } from "@/lib/server-events";

/** Auth, validation and lock acquisition still happen before choosing the response format. */
export function gradingResponse(
  request: Request,
  work: (
    signal: AbortSignal,
    progress: GradingProgressListener,
  ) => Promise<Response>,
) {
  if (!request.headers.get("Accept")?.includes("application/x-ndjson"))
    return work(request.signal, () => {});
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  let cancelled = false;
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const emit = (value: unknown) => {
          if (!cancelled)
            controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
        };
        void work(signal, (stage) => emit({ type: "progress", stage }))
          .then(async (response) => {
            emit({
              type: "result",
              status: response.status,
              body: await response.json(),
            });
          })
          .catch((cause) => {
            logServerEvent(
              {
                event: "api_failure",
                route: "/api/interview/end",
                status: 502,
              },
              cause,
            );
            emit({
              type: "result",
              status: 502,
              body: {
                error: "The scorecard couldn't be generated. Please retry.",
              },
            });
          })
          .finally(() => {
            if (!cancelled) controller.close();
          });
      },
      cancel() {
        cancelled = true;
        abort.abort();
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    },
  );
}
