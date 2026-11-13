import { PlayLanding } from "@/components/play/play-landing";
import { redirect } from "next/navigation";
import { candidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { problemBriefs } from "@/lib/problems";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { mockAccess } from "@/lib/mock-access-store";
import { LockedMocks } from "@/components/locked-mocks";
import { PlayShell } from "@/components/play/play-shell";
export async function PracticePage({
  view,
  sessionId,
}: {
  view: "home" | "history" | "brief" | "interview" | "results";
  sessionId?: string;
}) {
  let userId: string | undefined;
  try {
    userId = await candidateIdentity({ requireInvite: true });
  } catch (cause) {
    if (cause instanceof CandidateInviteError) redirect("/not-invited");
    if (!(cause instanceof CandidateAuthError)) throw cause;
    return (
      <main className="practice-page">
        <div className="practice-shell">
          <header className="practice-nav">
            <Brand />
            <ThemeToggle />
          </header>
          <p role="alert">
            Sign-in is temporarily unavailable. Please try again later.
          </p>
        </div>
      </main>
    );
  }
  if (!userId) {
    if (view !== "home") redirect("/sign-in");
    return <PlayLanding />;
  }
  if (view === "home") redirect("/play");
  const problems = problemBriefs();
  if (view === "brief") {
    const access = await mockAccess(userId);
    if (access.plan === "free")
      return (
        <PlayShell userId={userId} active="mock">
          <LockedMocks
            problems={problems}
            interested={Boolean(access.proInterestAt)}
          />
        </PlayShell>
      );
  }
  return (
    <CandidateWorkspace
      key={userId}
      userId={userId}
      problems={problems}
      view={view === "history" ? "home" : view}
      sessionId={sessionId}
    />
  );
}
