import "server-only";
import { configuredAdminId } from "@/lib/admin-config";

export class CandidateInviteError extends Error {
  readonly status = 403;
  constructor() {
    super(
      "You're not invited to the MockMeAI private beta yet. Please contact the person who invited you.",
    );
  }
}

/** Only a verified Auth ID/email may reach this boundary, never editable metadata. */
export function requireCandidateInvite(id: string, email: unknown) {
  if (id === configuredAdminId()) return;
  const allowed = (process.env.MOCKMEAI_INVITED_EMAILS ?? "")
    .split(/[,\n]/u)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (typeof email === "string" && allowed.includes(email.trim().toLowerCase()))
    return;
  throw new CandidateInviteError();
}
