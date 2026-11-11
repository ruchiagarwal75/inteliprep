import { BRAND } from "@/lib/brand";
import "server-only";
import { configuredAdminId } from "@/lib/admin-config";
import { supabaseServer } from "@/lib/supabase-server";
import { betaInviteEmail } from "@/lib/beta-invite-input";
import { CandidateAuthError } from "@/lib/supabase-config";

export class CandidateInviteError extends Error {
  readonly status = 403;
  constructor() {
    super(
      `You're not invited to the ${BRAND.name} private beta yet. Please contact the person who invited you.`,
    );
  }
}

/** Only a verified Auth ID/email may reach this boundary, never editable metadata. */
export async function requireCandidateInvite(
  id: string,
  email: unknown,
  client?: Awaited<ReturnType<typeof supabaseServer>>,
) {
  if (id === configuredAdminId()) return;
  if (!betaInviteEmail.safeParse(email).success)
    throw new CandidateInviteError();
  let approved: unknown;
  try {
    // The database derives the email from the signed JWT, not request input.
    // No cache: approvals and revocations apply on the next protected request.
    const { data, error } = await (client ?? (await supabaseServer())).rpc(
      "is_beta_invited",
    );
    if (error || typeof data !== "boolean") throw new CandidateAuthError(503);
    approved = data;
  } catch {
    throw new CandidateAuthError(503);
  }
  if (!approved) throw new CandidateInviteError();
}
