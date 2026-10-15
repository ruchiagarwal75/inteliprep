import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/monitoring/client-error/route";

const report = {
  kind: "render",
  page: "/interview",
  errorType: "Error",
  fingerprint: "a".repeat(64),
};
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/monitoring/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
describe("monitoring ingestion", () => {
  it("accepts anonymous allowlisted metadata", async () => {
    const response = await post(report);
    expect(response.status).toBe(204);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });
  it("rejects extra evidence fields and oversized reports", async () => {
    expect((await post({ ...report, message: "private answer" })).status).toBe(
      400,
    );
    expect((await post({ ...report, stack: "x".repeat(3_000) })).status).toBe(
      413,
    );
  });
});
