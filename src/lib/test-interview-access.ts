import "server-only";
import { configuredAdminId } from "@/lib/admin-config";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { currentCandidateId } from "@/lib/candidate-context";
import { ApiRequestError } from "@/lib/api-request";

/** The public picker is presentation only. Enforce test access before creating anything. */
export async function requireTestInterviewAccess(durationMinutes: number) {
  if (
    durationMinutes !== 1 ||
    process.env.INTELIPREP_ALLOW_TEST_INTERVIEWS === "1"
  )
    return;
  const admin = configuredAdminId();
  if (admin && currentCandidateId() === admin) {
    try {
      await requireAdminIdentity();
      return;
    } catch {
      // A stale or revoked admin session cannot enable hidden test interviews.
    }
  }
  throw new ApiRequestError(
    "One-minute interviews are only available to the admin or an explicitly enabled test environment.",
    400,
  );
}
