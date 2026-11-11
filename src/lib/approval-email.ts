import { BRAND } from "@/lib/brand";
import "server-only";
import { z } from "zod";

export type ApprovalEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};

export function approvalEmailPayload(email: string): ApprovalEmailPayload {
  return {
    from: `${BRAND.name} <hello@${BRAND.domain}>`,
    to: [z.email().parse(email)],
    subject: `Your ${BRAND.name} access is ready`,
    text: `You're approved to practice on ${BRAND.name}!\n\nVisit ${BRAND.url} and sign in with Google using ${email}.\n\nYou can choose a system design problem, draw your design, and get feedback after your interview.\n\nSee you there,\n${BRAND.name}`,
  };
}

export class ApprovalEmailError extends Error {
  constructor(
    public readonly category: string,
    public readonly status?: number,
  ) {
    super("Approval email could not be confirmed.");
  }
}

/** Fixed endpoint, bounded request, and a stable key for the entire retry window. */
export async function sendApprovalEmail(
  notificationId: string,
  payload: ApprovalEmailPayload,
) {
  if (!process.env.RESEND_API_KEY)
    throw new ApprovalEmailError("configuration");
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `mockmeai-approval/${notificationId}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
  } catch {
    throw new ApprovalEmailError("network_or_timeout");
  }
  if (!response.ok) {
    // Never read/log provider error bodies, which can include recipients or keys.
    throw new ApprovalEmailError(
      response.status === 401 || response.status === 403
        ? "provider_authentication"
        : response.status === 429
          ? "provider_limit"
          : response.status >= 500
            ? "provider_unavailable"
            : "provider_request",
      response.status,
    );
  }
  try {
    const result = z
      .object({ id: z.string().min(1).max(200) })
      .parse(await response.json());
    return result.id;
  } catch {
    throw new ApprovalEmailError("provider_response");
  }
}
