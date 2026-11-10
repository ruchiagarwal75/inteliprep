import { LegalLinks } from "@/components/legal-links";
import { HomeMascot } from "@/components/mascot-moments";
import { redirect } from "next/navigation";
import { candidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { problemBriefs } from "@/lib/problems";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { PracticeHero } from "@/components/practice-hero";
import { PracticeIcon } from "@/components/practice-icons";
export async function PracticePage({
  view,
  sessionId,
}: {
  view: "home" | "brief" | "interview" | "results";
  sessionId?: string;
}) {
  let userId: string | undefined;
  try {
    userId = await candidateIdentity({ requireInvite: true });
  } catch (cause) {
    if (cause instanceof CandidateInviteError) redirect("/not-invited");
    if (!(cause instanceof CandidateAuthError)) throw cause;
    return (
      <main className="p-6" role="alert">
        Sign-in is temporarily unavailable. Please try again later.
      </main>
    );
  }
  if (!userId) {
    if (view !== "home") redirect("/sign-in");
    return (
      <main className="practice-page mascot-home-page">
        <div className="practice-shell">
          <header className="practice-nav">
            <Brand />
            <div className="practice-account-actions">
              <Link className="practice-link" href="/sign-in">
                Sign in
              </Link>
            </div>
          </header>
          <PracticeHero>
            <Link className="practice-primary" href="/sign-in">
              Start practice
              <PracticeIcon name="arrow" />
            </Link>
          </PracticeHero>
          <section className="practice-surface welcome-note">
            <HomeMascot />
            <h2>Practice a design and get feedback on your approach.</h2>
            <p>
              Practice a realistic system design interview, sketch as you think,
              and get feedback grounded in your own answers.
            </p>
          </section>
          <p className="practice-note">
            Your practice history is saved in this browser.
          </p>
          <LegalLinks />
        </div>
      </main>
    );
  }
  const problems = problemBriefs();
  return (
    <CandidateWorkspace
      key={userId}
      userId={userId}
      problems={problems}
      view={view}
      sessionId={sessionId}
    />
  );
}
