import "server-only";
import { candidateSession } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
export async function requirePlayIdentity() {
  const session = await candidateSession({ requireInvite: true });
  if (!session) throw new CandidateAuthError();
  return session;
}
