import { describe, expect, it, vi } from "vitest";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
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
    vi.mocked(requireCandidateIdentity).mockRejectedValue(
      new CandidateAuthError(),
    );
    const response = await post(report);
    expect(response.status).toBe(204);
    expect(requireCandidateIdentity).not.toHaveBeenCalled();
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });
  it("requires a verified account before associating browser storage failures", async () => {
    vi.mocked(requireCandidateIdentity).mockRejectedValue(
      new CandidateAuthError(),
    );
    expect((await post({ ...report, kind: "storage" })).status).toBe(401);
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
