import "server-only";
import { supabaseServer } from "@/lib/supabase-server";
import { CandidateAuthError } from "@/lib/supabase-config";

/** Verify the signature; never authorize using getSession() or user_metadata. */
export async function candidateIdentity(): Promise<string | undefined> {
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
    return typeof id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
      ? id
      : undefined;
  } catch (cause) {
    if (cause instanceof CandidateAuthError) throw cause;
    throw new CandidateAuthError(503);
  }
}

export async function requireCandidateIdentity(): Promise<string> {
  const id = await candidateIdentity();
  if (!id) throw new CandidateAuthError();
  return id;
}
