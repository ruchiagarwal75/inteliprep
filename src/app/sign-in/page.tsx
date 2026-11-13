import Image from "next/image";
import brandStyles from "@/components/brand.module.css";
import { pageMetadata } from "@/lib/site-metadata";
import { LegalLinks } from "@/components/legal-links";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/google-sign-in";
import { candidateIdentity } from "@/lib/candidate-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";

import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { BRAND } from "@/lib/brand";

export const metadata = pageMetadata("Sign in", "/sign-in");
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
    } else id = await candidateIdentity({ requireInvite: true });
  } catch (cause) {
    if (cause instanceof CandidateInviteError) redirect("/not-invited");
    if (!(cause instanceof CandidateAuthError) && !returnTo) throw cause;
    unavailable = true;
  }
  if (id) redirect(returnTo ?? "/play");
  return (
    <main className="bg-surface flex min-h-dvh items-center justify-center p-6">
      <div className="bg-background border-border w-full max-w-md rounded-2xl border p-8 shadow-sm">
        <header className="sign-in-header mb-6">
          <Brand />
          <ThemeToggle />
        </header>
        <Image
          src="/brand/pixel/shardling-icon.svg"
          alt=""
          width={64}
          height={64}
          unoptimized
          className={brandStyles.signInIcon}
        />
        <h1 className="mb-3 text-2xl font-semibold">Sign in to practice</h1>
        <p className="text-muted mb-6">
          {BRAND.tagline} Sign in to start a practice round.
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
        <p className="text-muted mt-6 text-sm">
          Your progress is saved to your account.
        </p>
        <LegalLinks />
      </div>
    </main>
  );
}
