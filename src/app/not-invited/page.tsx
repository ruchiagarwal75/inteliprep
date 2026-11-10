import { candidateIdentity } from "@/lib/candidate-auth";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { InviteSignOut } from "@/components/invite-sign-out";

export const metadata = { title: "Private beta | MockMeAI" };
export default async function NotInvitedPage() {
  const userId = await candidateIdentity();
  return (
    <main className="practice-page">
      <div className="practice-shell">
        <Brand />
        <section className="practice-surface welcome-note">
          <h1>You&apos;re not invited yet</h1>
          <p>
            MockMeAI is in private beta. Contact the person who invited you to
            get access for your Google account.
          </p>
          <InviteSignOut userId={userId} />
          <p>
            <Link href="/">Return to MockMeAI</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
