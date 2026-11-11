"use client";
import { CandidateAccountProvider } from "@/components/candidate-account-provider";
import { InterviewWorkspace } from "@/components/interview-workspace";
import type { ProblemSummary } from "@/lib/interview-selection";
export function CandidateWorkspace({
  userId,
  problems,
  view = "interview",
  sessionId,
}: {
  userId: string;
  problems: ProblemSummary[];
  view?: "home" | "brief" | "interview" | "results";
  sessionId?: string;
}) {
  return (
    <CandidateAccountProvider userId={userId}>
      <InterviewWorkspace
        key={userId}
        problems={problems}
        view={view}
        sessionId={sessionId}
      />
    </CandidateAccountProvider>
  );
}
