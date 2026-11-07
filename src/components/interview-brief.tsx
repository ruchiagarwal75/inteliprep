"use client";
import { useEffect, useRef } from "react";
import { Brand } from "@/components/brand";
import type { ProblemSummary } from "@/lib/interview-selection";
import type { useInterviewStarter } from "@/components/use-interview-starter";
import { InterviewSetup } from "@/components/interview-setup";
import { PracticeHero } from "@/components/practice-hero";
import { PracticeIcon } from "@/components/practice-icons";
import { PracticeStepper } from "@/components/practice-stepper";

export function InterviewBrief({
  problems,
  starter,
}: {
  problems: ProblemSummary[];
  starter: ReturnType<typeof useInterviewStarter>;
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
        </header>
        <PracticeHero brief />
        <div className="practice-surface">
          <div className="practice-setup">
            <InterviewSetup
              problems={problems}
              hasEnded={false}
              disabled={false}
              choice={starter.choice}
              onChoice={starter.setChoice}
              onStart={() => void starter.start()}
              onNew={() => {}}
              onChangeProblem={() => {}}
              isStarting={starter.isStarting}
              hideStart
            />
          </div>
          <div className="brief-layout">
            <section className="problem-card" aria-label="Problem brief">
              <p className="practice-kicker">Your challenge</p>
              <h2>{selected?.title}</h2>
              <p>
                {selected?.brief?.[starter.choice.level] ?? selected?.summary}
              </p>
            </section>
            <aside className="brief-tips" aria-labelledby="tips-title">
              <h2 id="tips-title">A small guide</h2>
              <ul>
                <li className="tip-row">
                  <span className="tip-icon">
                    <PracticeIcon name="draw" />
                  </span>
                  <div>
                    <h3>Draw your approach</h3>
                    <p>
                      Add components and connections. Questions pause while you
                      draw.
                    </p>
                  </div>
                </li>
                <li className="tip-row">
                  <span className="tip-icon">
                    <PracticeIcon name="explain" />
                  </span>
                  <div>
                    <h3>Talk it through</h3>
                    <p>
                      Choose Ready to explain. Take as many messages as you
                      need.
                    </p>
                  </div>
                </li>
                <li className="tip-row">
                  <span className="tip-icon">
                    <PracticeIcon name="discuss" />
                  </span>
                  <div>
                    <h3>Open the discussion</h3>
                    <p>
                      Choose Done explaining for follow-ups. You can pause to
                      draw again.
                    </p>
                  </div>
                </li>
              </ul>
            </aside>
          </div>
          <PracticeStepper />
          <div className="brief-start">
            <button
              disabled={starter.isStarting || starter.isLimited}
              aria-describedby={starter.error ? "start-error" : "start-note"}
              className="practice-primary"
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
