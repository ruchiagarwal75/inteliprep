import "server-only";
import { redirect } from "next/navigation";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
export async function playAccountId() {
  try {
    return await requireCandidateIdentity();
  } catch (cause) {
    if (cause instanceof CandidateInviteError) redirect("/not-invited");
    if (cause instanceof CandidateAuthError && cause.status === 401)
      redirect("/sign-in");
    throw cause;
  }
}
