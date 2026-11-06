import { redirect } from "next/navigation";
import { candidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { listProblems, getProblem } from "@/lib/problems";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import Link from "next/link";
export async function PracticePage({
  view,
  sessionId,
}: {
  view: "home" | "brief" | "interview" | "results";
  sessionId?: string;
}) {
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
  if (!userId) {
    if (view !== "home") redirect("/sign-in");
    return (
      <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">InteliPrep</h1>
        <p>
          Practice a system design interview and review evidence-backed
          feedback.
        </p>
        <Link
          className="bg-foreground text-background inline-block rounded px-4 py-3"
          href="/sign-in"
        >
          Start practice
        </Link>
        <p className="text-sm">
          Practice history is stored in this browser. Sign in to start or resume
          your interviews.
        </p>
      </main>
    );
  }
  const problems = listProblems().map((summary) => {
    const problem = getProblem(summary.problemId);
    return {
      ...summary,
      brief: problem
        ? {
            mid: problem.levels.mid.openingMessage,
            senior: problem.levels.senior.openingMessage,
            staff: problem.levels.staff.openingMessage,
          }
        : undefined,
    };
  });
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
