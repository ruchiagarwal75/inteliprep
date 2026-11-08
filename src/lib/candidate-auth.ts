import "server-only";
import { supabaseServer } from "@/lib/supabase-server";
import { CandidateAuthError } from "@/lib/supabase-config";
import {
  CandidateInviteError,
  requireCandidateInvite,
} from "@/lib/candidate-invites";

/** Verify the signature; never authorize using getSession() or user_metadata. */
export async function candidateIdentity(options?: {
  requireInvite?: boolean;
}): Promise<string | undefined> {
  const client = await supabaseServer();
  try {
    const { data, error } = await client.auth.getClaims();
    if (error) {
      if (
        error.status === undefined ||
        error.status === 0 ||
        error.status >= 500
      )
        throw new CandidateAuthError(503);
      return undefined;
    }
    if (data?.claims.is_anonymous === true) return undefined;
    const id: unknown = data?.claims.sub;
    const verified =
      typeof id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
        ? id
        : undefined;
    if (verified && options?.requireInvite)
      await requireCandidateInvite(verified, data?.claims.email, client);
    return verified;
  } catch (cause) {
    if (
      cause instanceof CandidateAuthError ||
      cause instanceof CandidateInviteError
    )
      throw cause;
    throw new CandidateAuthError(503);
  }
}

export async function requireCandidateIdentity(): Promise<string> {
  const id = await candidateIdentity({ requireInvite: true });
  if (!id) throw new CandidateAuthError();
  return id;
}
