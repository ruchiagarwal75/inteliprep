import { adminWrite } from "@/lib/admin-api";
import { readJsonBody } from "@/lib/api-request";
import { betaEmailRetry } from "@/lib/beta-invite-input";
import { deliverApprovalEmail } from "@/lib/approval-email-delivery";

export const runtime = "nodejs";
export const POST = adminWrite(async (request) => {
  const { notificationId } = betaEmailRetry.parse(
    await readJsonBody(request, 1024),
  );
  return { notification: await deliverApprovalEmail(notificationId) };
});
