import { pageMetadata } from "@/lib/site-metadata";
import { BRAND } from "@/lib/brand";
import { candidateIdentity } from "@/lib/candidate-auth";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { InviteSignOut } from "@/components/invite-sign-out";

export const metadata = pageMetadata("Private beta", "/not-invited");
export default async function NotInvitedPage() {
  const userId = await candidateIdentity();
  return (
    <main className="practice-page">
      <div className="practice-shell">
        <header className="practice-nav">
          <Brand />
          <ThemeToggle />
        </header>
        <section className="practice-surface welcome-note">
          <h1>You&apos;re not invited yet</h1>
          <p>
            {BRAND.name} is in private beta. Contact the person who invited you
            to get access for your Google account.
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
