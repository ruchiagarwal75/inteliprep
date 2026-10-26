import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/google-sign-in";
import { candidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";

export const metadata = { title: "Sign in | InteliPrep" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  let unavailable = false;
  let id: string | undefined;
  try {
    id = await candidateIdentity();
  } catch (cause) {
    if (!(cause instanceof CandidateAuthError)) throw cause;
    unavailable = true;
  }
  if (id) redirect("/interview");
  const params = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-600">InteliPrep</p>
        <h1 className="mb-3 text-2xl font-semibold">Sign in to practice</h1>
        <p className="mb-6 text-slate-600">
          Practice a system design interview and review your feedback.
        </p>
        {unavailable ? (
          <p role="alert">
            Sign-in is temporarily unavailable. Please try again later.
          </p>
        ) : (
          <GoogleSignIn
            failure={
              params.error === "connection"
                ? "connection"
                : params.error === "1"
                  ? "generic"
                  : undefined
            }
          />
        )}
        <p className="mt-6 text-sm text-slate-500">
          Your interview history stays in this browser, separately for each
          account.
        </p>
      </div>
    </main>
  );
}
