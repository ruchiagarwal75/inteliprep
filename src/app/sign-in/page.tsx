import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/google-sign-in";
import { candidateIdentity } from "@/lib/candidate-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { CandidateAuthError } from "@/lib/supabase-config";

import { Brand } from "@/components/brand";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `Sign in | ${BRAND.name}` };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params.next === "/admin" ? "/admin" : undefined;
  let unavailable = false;
  let id: string | undefined;
  try {
    if (returnTo) {
      // Revoked admin sessions must show sign-in, not loop on a still-signed JWT.
      const { data, error } = await (await supabaseServer()).auth.getUser();
      if (error && (!error.status || error.status >= 500))
        throw new CandidateAuthError(503);
      id = error || data.user?.is_anonymous ? undefined : data.user?.id;
    } else id = await candidateIdentity();
  } catch (cause) {
    if (!(cause instanceof CandidateAuthError) && !returnTo) throw cause;
    unavailable = true;
  }
  if (id) redirect(returnTo ?? "/interview");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="bg-background w-full max-w-md rounded-2xl border border-slate-200 p-8 shadow-sm dark:border-slate-700">
        <div className="mb-6">
          <Brand />
        </div>
        <h1 className="mb-3 text-2xl font-semibold">Sign in to practice</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          {BRAND.tagline} Sign in to start your next system design interview.
        </p>
        {unavailable ? (
          <p role="alert">
            Sign-in is temporarily unavailable. Please try again later.
          </p>
        ) : (
          <GoogleSignIn
            returnTo={returnTo}
            failure={
              params.error === "connection"
                ? "connection"
                : params.error === "1"
                  ? "generic"
                  : undefined
            }
          />
        )}
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Your interview history stays in this browser, separately for each
          account.
        </p>
      </div>
    </main>
  );
}
