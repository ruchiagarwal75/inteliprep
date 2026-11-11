import { expect, it, vi } from "vitest";
import { gradingResponse } from "@/lib/grading-response";
import { readGradingResponse } from "@/lib/read-grading-response";
const request = (stream = true) =>
  new Request("http://localhost/api/interview/end", {
    headers: stream ? { Accept: "application/x-ndjson" } : {},
  });
it("streams actual server stages and preserves the final response", async () => {
  const observed: string[] = [];
  const response = await gradingResponse(
    request(),
    async (_signal, progress) => {
      progress("reading");
      progress("writing");
      progress("checking");
      return Response.json({ ended: true, scorecard: { signal: "no" } });
    },
  );
  const result = await readGradingResponse(response, (stage) =>
    observed.push(stage),
  );
  expect(observed).toEqual(["reading", "writing", "checking"]);
  expect(result.response.status).toBe(200);
  expect(result.body).toEqual({ ended: true, scorecard: { signal: "no" } });
});
it("keeps legacy JSON errors and streamed application failures compatible", async () => {
  for (const stream of [true, false]) {
    const response = await gradingResponse(request(stream), async () =>
      Response.json({ ended: true, error: "Please retry." }, { status: 502 }),
    );
    const result = await readGradingResponse(response, () => {});
    expect(result.response.status).toBe(502);
    expect(result.body).toEqual({ ended: true, error: "Please retry." });
  }
});
it("cancels work when the stream is cancelled", async () => {
  const cancelled = vi.fn();
  const response = await gradingResponse(
    request(),
    (signal) =>
      new Promise((resolve) => {
        signal.addEventListener(
          "abort",
          () => {
            cancelled();
            resolve(Response.json({ ended: true }));
          },
          { once: true },
        );
      }),
  );
  await response.body?.cancel();
  expect(cancelled).toHaveBeenCalledOnce();
});
it.each([
  "",
  '{"type":"progress","stage":"writing"}\n',
  '{"type":"progress","stage":"made_up"}\n',
])(
  "rejects truncated or malformed progress instead of dropping the error",
  async (text) => {
    await expect(
      readGradingResponse(
        new Response(text, {
          headers: { "Content-Type": "application/x-ndjson" },
        }),
        () => {},
      ),
    ).rejects.toThrow(/scorecard response/iu);
  },
);
