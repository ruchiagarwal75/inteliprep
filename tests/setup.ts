import { beforeEach, vi } from "vitest";
import { requireCandidateIdentity } from "@/lib/candidate-auth";

const testCandidate = "11111111-1111-4111-8111-111111111111";
vi.mock("@/lib/candidate-auth", async (original) => ({
  ...(await original<typeof import("@/lib/candidate-auth")>()),
  requireCandidateIdentity: vi.fn(
    async () => "11111111-1111-4111-8111-111111111111",
  ),
}));
vi.mock("@/lib/candidate-context", async (original) => {
  const actual = await original<typeof import("@/lib/candidate-context")>();
  return {
    ...actual,
    currentCandidateId: () =>
      actual.currentCandidateId() ?? "11111111-1111-4111-8111-111111111111",
  };
});
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_test_fixture";

// Each test starts with fresh local quotas; individual tests can exercise exhaustion.
beforeEach(() => {
  if (vi.isMockFunction(requireCandidateIdentity)) {
    vi.mocked(requireCandidateIdentity).mockResolvedValue(testCandidate);
  }
  const state = globalThis as typeof globalThis & {
    inteliprepRequestCounters?: Map<string, unknown>;
  };
  state.inteliprepRequestCounters?.clear();
});
