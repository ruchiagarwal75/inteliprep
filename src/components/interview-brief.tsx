"use client";
import { useEffect, useRef } from "react";
import { Brand } from "@/components/brand";
import { CandidateProfileMenu } from "@/components/candidate-profile-menu";
import { BriefMascot } from "@/components/mascot-moments";
import type { ProblemSummary } from "@/lib/interview-selection";
import type { useInterviewStarter } from "@/components/use-interview-starter";
import { InterviewSetup } from "@/components/interview-setup";
import { PracticeHero } from "@/components/practice-hero";
import { PracticeIcon } from "@/components/practice-icons";
import { PracticeGuide } from "@/components/practice-guide";
import { PracticeStepper } from "@/components/practice-stepper";

export function InterviewBrief({
  problems,
  starter,
  onChoice,
}: {
  problems: ProblemSummary[];
  starter: ReturnType<typeof useInterviewStarter>;
  onChoice: (choice: ReturnType<typeof useInterviewStarter>["choice"]) => void;
}) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  const hasError = Boolean(starter.error);
  useEffect(() => {
    if (hasError) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [hasError]);
  const selected = problems.find(
    (p) => p.problemId === starter.choice.problemId,
  );
  return (
    <main className="practice-page">
      <div className="practice-shell">
        <header className="practice-nav">
          <Brand />
          <CandidateProfileMenu />
        </header>
        <PracticeHero brief />
        <div className="practice-surface brief-mascot-surface">
          <BriefMascot />
          <div className="practice-setup">
            <InterviewSetup
              problems={problems}
              hasEnded={false}
              disabled={false}
              choice={starter.choice}
              onChoice={onChoice}
              onStart={() => void starter.start()}
              onNew={() => {}}
              onChangeProblem={() => {}}
              isStarting={starter.isStarting}
              hideStart
            />
          </div>
          <div className="brief-layout">
            <section className="problem-card" aria-label="Problem brief">
              <h2>{selected?.title}</h2>
              <p>
                {selected?.brief?.[starter.choice.level] ?? selected?.summary}
              </p>
            </section>
            <PracticeGuide />
          </div>
          <PracticeStepper />
          <div className="brief-start">
            <button
              disabled={starter.isStarting || starter.isLimited}
              aria-describedby={starter.error ? "start-error" : "start-note"}
              className="practice-primary start-interview-button"
              onClick={() => void starter.start()}
            >
              {starter.isStarting ? "Starting…" : "Start interview"}
              <PracticeIcon name="arrow" />
            </button>
            <p id="start-note" className="practice-muted">
              The timer starts when you do.
              <br />
              Every attempt is kept in history.
            </p>
          </div>
          {starter.error && (
            <p
              id="start-error"
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="practice-error"
            >
              {starter.error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
