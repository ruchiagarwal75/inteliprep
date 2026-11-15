import "server-only";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin-auth";
import { reportingDb } from "@/lib/reporting-db";
import { reportingEnvironment } from "@/lib/admin-config";
import { ApiRequestError } from "@/lib/api-request";
import { withPlayer } from "@/lib/play/database";

export const adminMockTrialCommand = z.strictObject({
  requestId: z.uuid(),
  action: z.enum(["approve", "revoke"]),
  commandId: z.uuid(),
  expectedVersion: z.number().int().nonnegative(),
});
export async function changeMockTrial(input: unknown) {
  const actor = await requireAdminIdentity();
  const command = adminMockTrialCommand.parse(input);
  const sql = reportingDb();
  const [owner] = await sql<
    { user_id: string }[]
  >`select user_id from interview_admin.mock_beta_requests where id=${command.requestId} and environment=${reportingEnvironment()} and requested_at is not null`;
  if (!owner) throw new ApiRequestError("Request not found.", 404);
  return withPlayer(owner.user_id, async (tx) => {
    const [request] = await tx<
      { version: number }[]
    >`select version from interview_admin.mock_beta_requests where id=${command.requestId}`;
    const [replay] = await tx<
      { request_id: string }[]
    >`select request_id from interview_admin.mock_beta_grants where id=${command.commandId}`;
    if (replay && replay.request_id !== command.requestId)
      throw new ApiRequestError(
        "This command belongs to another request.",
        400,
      );
    if (replay && command.action === "approve") return { saved: true };
    if (request?.version !== command.expectedVersion)
      throw new ApiRequestError(
        "This request changed. Refresh before deciding again.",
        409,
      );
    if (command.action === "approve") {
      const [available] =
        await tx`select 1 from interview_admin.mock_beta_grants where request_id=${command.requestId} and consumed_session_id is null and revoked_at is null`;
      if (available) return { saved: true };
      await tx`insert into interview_admin.mock_beta_grants(id,request_id,approved_by) values(${command.commandId},${command.requestId},${actor})`;
      await tx`update interview_admin.mock_beta_requests set status='approved',version=version+1 where id=${command.requestId}`;
    } else {
      await tx`update interview_admin.mock_beta_grants set revoked_at=now(),revoked_by=${actor} where request_id=${command.requestId} and consumed_session_id is null and revoked_at is null`;
      await tx`update interview_admin.mock_beta_requests set status='revoked',version=version+1 where id=${command.requestId}`;
    }
    return { saved: true };
  });
}
