import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
async function readPlayAccountId() {
  try {
    return await requireCandidateIdentity();
  } catch (cause) {
    if (cause instanceof CandidateInviteError) redirect("/not-invited");
    if (cause instanceof CandidateAuthError && cause.status === 401)
      redirect("/sign-in");
    throw cause;
  }
}

export const playAccountId = cache(readPlayAccountId);
