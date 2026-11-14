import "server-only";
import { observeAccountAccess } from "@/lib/account-onboarding";
import { supabaseServer } from "@/lib/supabase-server";
import { CandidateAuthError } from "@/lib/supabase-config";
import { observeSignedIn } from "@/lib/beta-funnel-tracking";
import {
  CandidateInviteError,
  requireCandidateInvite,
} from "@/lib/candidate-invites";

/** Verify the signature; never authorize using getSession() or user_metadata. */
export async function candidateIdentity(options?: {
  requireInvite?: boolean;
  revalidateUser?: boolean;
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
    if (verified && options?.revalidateUser) {
      const { data: fresh, error: invalid } = await client.auth.getUser();
      if (invalid) {
        if (
          invalid.status === undefined ||
          invalid.status === 0 ||
          invalid.status >= 500
        )
          throw new CandidateAuthError(503);
        return;
      }
      if (fresh.user?.id !== verified || fresh.user.is_anonymous) return;
    }
    if (verified) observeSignedIn(verified, data?.claims.session_id);
    if (verified && options?.requireInvite) {
      await requireCandidateInvite(verified, data?.claims.email, client);
      observeAccountAccess(verified, data?.claims.email);
    }
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

export async function requireCandidateIdentity(options?: {
  revalidateUser?: boolean;
}): Promise<string> {
  const id = await candidateIdentity({ ...options, requireInvite: true });
  if (!id) throw new CandidateAuthError();
  return id;
}
