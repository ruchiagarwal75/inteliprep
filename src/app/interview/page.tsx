import { redirect } from "next/navigation";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import { candidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { listProblems } from "@/lib/problems";

export const metadata = { title: "Practice interview | InteliPrep" };

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  let userId: string | undefined;
  try {
    userId = await candidateIdentity();
  } catch (cause) {
    if (!(cause instanceof CandidateAuthError)) throw cause;
    return (
      <main className="p-6" role="alert">
        Sign-in is temporarily unavailable. Please try again later.
      </main>
    );
  }
  if (!userId) redirect("/sign-in");
  return (
    <CandidateWorkspace
      key={userId}
      userId={userId}
      problems={listProblems()}
    />
  );
}
