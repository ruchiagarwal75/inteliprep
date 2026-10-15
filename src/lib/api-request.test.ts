import { afterEach, describe, expect, it, vi } from "vitest";
import { readJsonBody, withApiRequest } from "@/lib/api-request";

const request = (body: string, headers?: HeadersInit) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("API boundary", () => {
  it("handles JSON and rejects invalid, oversized and wrongly typed bodies", async () => {
    expect(await readJsonBody(request('{"name":"é"}'), 13)).toEqual({
      name: "é",
    });
    await expect(
      readJsonBody(request('{"name":"é"}'), 12),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readJsonBody(request("{}", { "Content-Length": "100" }), 50),
    ).rejects.toMatchObject({ status: 413 });
    await expect(readJsonBody(request("invalid"), 50)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      readJsonBody(request("{}", { "Content-Type": "text/plain" }), 50),
    ).rejects.toMatchObject({ status: 415 });
  });
  it("enforces real stream length without Content-Length", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"value":"'));
        controller.enqueue(new TextEncoder().encode("x".repeat(100)));
        controller.close();
      },
    });
    const streamed = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(streamed, 30)).rejects.toMatchObject({
      status: 413,
    });
  });
  it("rejects cross-origin posts before running the handler", async () => {
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const post = withApiRequest("start", "/api/interview/start", handler);
    const response = await post(
      request("{}", { origin: "https://other.example" }),
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(response.headers.get("X-Request-Id")).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("stops excess calls and returns Retry-After before downstream work", async () => {
    const handler = vi
      .fn()
      .mockImplementation(async () => Response.json({ ok: true }));
    const post = withApiRequest("start", "/api/interview/start", handler);
    for (let i = 0; i < 10; i++)
      expect((await post(request("{}"))).status).toBe(200);
    const limited = await post(request("{}"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect(handler).toHaveBeenCalledTimes(10);
  });
  it("fails closed without beta configuration and hides unexpected exceptions", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = vi
      .fn()
      .mockRejectedValue(new Error("private candidate data"));
    const post = withApiRequest("start", "/api/interview/start", handler);
    expect(await (await post(request("{}"))).text()).not.toContain(
      "private candidate",
    );
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("OPENAI_KEY", "");
    expect((await post(request("{}"))).status).toBe(503);
    expect(handler).toHaveBeenCalledOnce();
  });
});
