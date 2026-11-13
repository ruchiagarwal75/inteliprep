import { beforeEach, vi } from "vitest";
import { requireCandidateIdentity } from "@/lib/candidate-auth";

const testCandidate = "11111111-1111-4111-8111-111111111111";
// Legacy engine tests use an entitled fixture. Access policy tests unmock this
// adapter and run the real SQL policy against isolated Postgres.
vi.mock("@/lib/mock-start-access", async (original) => ({
  ...(await original<typeof import("@/lib/mock-start-access")>()),
  withMockStartAccess: async <T>(
    _input: unknown,
    create: (existingSessionId?: string) => Promise<T>,
  ) => create(),
}));
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
process.env.INTELIPREP_ALLOW_TEST_INTERVIEWS = "1";
process.env.INTERVIEW_RESUME_SECRET =
  "test-only-stable-dedicated-resume-secret";

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
