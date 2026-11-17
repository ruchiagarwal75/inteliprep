import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { candidateSession } from "@/lib/candidate-auth";
import { guestPageAllowed } from "./guest-policy";
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

/** Guest pages opt in. Existing Play pages retain the real-account guard above. */
export const guestPlayAccount = cache(async () => {
  try {
    return await candidateSession({ requireInvite: true });
  } catch (cause) {
    if (cause instanceof CandidateInviteError) redirect("/not-invited");
    throw cause;
  }
});

export async function guestPlayPage(path: string) {
  const account = await guestPlayAccount();
  if (account?.kind === "guest" && !guestPageAllowed(path))
    redirect("/sign-in?guest=limit");
  return account;
}
