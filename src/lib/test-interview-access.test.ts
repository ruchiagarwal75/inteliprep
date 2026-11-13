import { afterEach, expect, it, vi } from "vitest";
import { requireTestInterviewAccess } from "@/lib/test-interview-access";
const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminIdentity: verify }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("requires fresh admin verification when the server test flag is off", async () => {
  vi.stubEnv("INTELIPREP_ALLOW_TEST_INTERVIEWS", "0");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  verify.mockResolvedValue("11111111-1111-4111-8111-111111111111");
  await expect(requireTestInterviewAccess(1)).resolves.toBeUndefined();
  expect(verify).toHaveBeenCalledOnce();
  verify.mockRejectedValue(new Error("revoked"));
  await expect(requireTestInterviewAccess(1)).rejects.toMatchObject({
    status: 400,
  });
});
it("permits ordinary sessions and an explicit server-only test flag", async () => {
  vi.stubEnv("ADMIN_USER_ID", "");
  vi.stubEnv("INTELIPREP_ALLOW_TEST_INTERVIEWS", "0");
  await expect(requireTestInterviewAccess(45)).resolves.toBeUndefined();
  await expect(requireTestInterviewAccess(60)).resolves.toBeUndefined();
  await expect(requireTestInterviewAccess(1)).rejects.toMatchObject({
    status: 400,
  });
  vi.stubEnv("INTELIPREP_ALLOW_TEST_INTERVIEWS", "1");
  await expect(requireTestInterviewAccess(1)).resolves.toBeUndefined();
  expect(verify).not.toHaveBeenCalled();
});
it("does not let a server test flag grant one-minute access in a deployed runtime", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ADMIN_USER_ID", "");
  vi.stubEnv("INTELIPREP_ALLOW_TEST_INTERVIEWS", "1");
  await expect(requireTestInterviewAccess(1)).rejects.toMatchObject({
    status: 400,
  });
});
