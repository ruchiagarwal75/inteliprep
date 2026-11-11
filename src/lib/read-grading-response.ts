import {
  gradingEventSchema,
  type GradingProgressListener,
} from "@/lib/grading-progress";

/** Keep ordinary JSON errors and legacy responses compatible with streamed progress. */
export async function readGradingResponse(
  response: Response,
  progress: GradingProgressListener,
) {
  if (
    !response.ok ||
    !response.headers.get("Content-Type")?.includes("application/x-ndjson")
  )
    return { response, body: (await response.json()) as unknown };
  if (!response.body)
    throw new Error("The scorecard response was interrupted. Please retry.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let pending = "",
    bytes = 0,
    result: { status: number; body: unknown } | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const parsed = gradingEventSchema.safeParse(
      (() => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return undefined;
        }
      })(),
    );
    if (!parsed.success)
      throw new Error("The scorecard response couldn't be read. Please retry.");
    const event = parsed.data;
    if (result)
      throw new Error("The scorecard response couldn't be read. Please retry.");
    if (event.type === "progress") progress(event.stage);
    else result = event;
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 262144)
        throw new Error("The scorecard response is too large. Please retry.");
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      lines.forEach(consume);
    }
    consume(pending + decoder.decode());
    if (!result)
      throw new Error("The scorecard response was interrupted. Please retry.");
    return {
      response: new Response(null, {
        status: result.status,
        headers: response.headers,
      }),
      body: result.body,
    };
  } catch (cause) {
    await reader.cancel().catch(() => {});
    throw cause;
  } finally {
    reader.releaseLock();
  }
}
