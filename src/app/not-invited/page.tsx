import { pageMetadata } from "@/lib/site-metadata";
import { BRAND } from "@/lib/brand";
import { candidateIdentity } from "@/lib/candidate-auth";
import { redirect } from "next/navigation";
import { CandidateInviteError } from "@/lib/candidate-invites";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { InviteSignOut } from "@/components/invite-sign-out";

export const metadata = pageMetadata("Account access", "/not-invited");
export default async function NotInvitedPage() {
  const userId = await candidateIdentity();
  if (userId) {
    const allowed = await candidateIdentity({ requireInvite: true }).catch(
      (cause) => {
        if (cause instanceof CandidateInviteError) return undefined;
        throw cause;
      },
    );
    if (allowed) redirect("/play");
  }
  return (
    <main className="practice-page">
      <div className="practice-shell">
        <header className="practice-nav">
          <Brand />
          <ThemeToggle />
        </header>
        <section className="practice-surface welcome-note">
          <h1>Account access is restricted</h1>
          <p>
            Access to {BRAND.name} has been restricted for this Google account.
            Contact the app owner if you think this is a mistake.
          </p>
          <InviteSignOut userId={userId} />
          <p>
            <Link href="/">Return to {BRAND.name}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
