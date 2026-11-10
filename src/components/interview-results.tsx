"use client";
import Link from "next/link";
import { InterviewFeedbackCard } from "@/components/interview-feedback-card";
import { ScorecardViewTracker } from "@/components/scorecard-view-tracker";
import { ScorecardLoading } from "@/components/scorecard-loading";
import { ResultsMascot } from "@/components/mascot-moments";
import { useRef, useState } from "react";
import type { Scorecard } from "@/lib/scorecard";
import type { Scene } from "@/lib/scene";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { ChatMessage } from "@/lib/chat";
import type { InterviewStart } from "@/lib/interview-selection";
import { InterviewScorecard } from "@/components/interview-scorecard";
import { ChatTranscript } from "@/components/chat-transcript";
import { Whiteboard } from "@/components/whiteboard";
import { formatInterviewTime } from "@/lib/interview-timer";
import { INTERVIEW_STAGE_NAMES } from "@/lib/interview-stage-names";
export function InterviewResults({
  scorecard,
  scene,
  whiteboard,
  interview,
  messages,
  retry,
  busy,
  closed,
  error,
  endedAt,
  timedOut = false,
}: {
  scorecard?: Scorecard;
  scene?: Scene;
  whiteboard: WhiteboardScene;
  interview?: InterviewStart;
  messages: ChatMessage[];
  retry: () => void;
  busy: boolean;
  closed: boolean;
  error?: string;
  endedAt?: string;
  timedOut?: boolean;
}) {
  const [tab, setTab] = useState<"scorecard" | "transcript" | "diagram">(
    "scorecard",
  );
  const used =
    scorecard?.session ??
    (interview?.timing && endedAt
      ? {
          elapsedSeconds: Math.min(
            interview.timing.durationMinutes * 60,
            Math.max(
              0,
              Math.round(
                (Date.parse(endedAt) - Date.parse(interview.timing.startedAt)) /
                  1000,
              ),
            ),
          ),
          allowedSeconds: interview.timing.durationMinutes * 60,
        }
      : undefined);
  const logRef = useRef<HTMLDivElement>(null);
  const brief = (problem?: string) =>
    `/interview/new?problem=${encodeURIComponent(problem ?? interview?.problemId ?? "single-server-scaling")}`;
  return (
    <div className="interview-results">
      {tab === "scorecard" &&
        scorecard &&
        !scorecard.notScoredReason &&
        interview?.sessionId && (
          <ScorecardViewTracker interviewId={interview.sessionId} />
        )}
      <ResultsMascot scorecard={scorecard} ready={!busy && !closed} />
      <header className="results-heading">
        <h2 className="results-title">Interview results</h2>
        {used && (
          <p>
            Time used: {formatInterviewTime(used.elapsedSeconds)} of{" "}
            {formatInterviewTime(used.allowedSeconds)}
          </p>
        )}
        <nav className="flex flex-wrap gap-2" aria-label="Next practice">
          <Link className="practice-primary" href={brief()}>
            {timedOut ? "Start a new interview" : "Retry this problem"}
          </Link>
          {!timedOut && (
            <Link
              className="practice-secondary"
              href={brief(scorecard?.nextPractice.problemId)}
            >
              Try suggested problem
            </Link>
          )}
        </nav>
        <details className="results-stage-guide">
          <summary>Interview stages</summary>
          <ol className="results-stage-list" aria-label="Interview stages">
            {INTERVIEW_STAGE_NAMES.map((name, i) => (
              <li key={name}>
                {i + 1}. {name}
              </li>
            ))}
          </ol>
        </details>
        <div
          role="tablist"
          aria-label="Interview results"
          className="results-tabs"
        >
          {(["scorecard", "transcript", "diagram"] as const).map((t) => (
            <button
              key={t}
              id={`results-tab-${t}`}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`results-${t}`}
              className="results-tab"
              tabIndex={tab === t ? 0 : -1}
              onKeyDown={(event) => {
                const tabs = ["scorecard", "transcript", "diagram"] as const;
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const index =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : (tabs.indexOf(t) +
                          (event.key === "ArrowRight" ? 1 : 2)) %
                        3;
                setTab(tabs[index]);
                document.getElementById(`results-tab-${tabs[index]}`)?.focus();
              }}
              onClick={() => setTab(t)}
            >
              {t === "diagram"
                ? "Final diagram"
                : t === "transcript"
                  ? "Transcript"
                  : "Scorecard"}
            </button>
          ))}
        </div>
      </header>
      <div
        id={`results-${tab}`}
        role="tabpanel"
        aria-labelledby={`results-tab-${tab}`}
        className={`results-content results-content-${tab}`}
      >
        {tab === "scorecard" &&
          (scorecard ? (
            <InterviewScorecard scorecard={scorecard} scene={scene} />
          ) : busy ? (
            <ScorecardLoading />
          ) : (
            <div className="results-pending">
              <p role={error && !busy ? "alert" : "status"}>
                {timedOut
                  ? "This interview timed out while you were away, so it can’t be scored. Your chat and drawing are saved below."
                  : closed
                    ? "Closed without scoring. Your transcript and diagram are saved."
                    : busy
                      ? "Generating your scorecard…"
                      : (error ??
                        "Your interview has ended. Generate its scorecard to see feedback.")}
              </p>
              {!closed && !busy && (
                <button
                  className="practice-primary"
                  disabled={busy}
                  onClick={retry}
                >
                  Retry scorecard
                </button>
              )}
            </div>
          ))}
        {tab === "transcript" && (
          <ChatTranscript
            logRef={logRef}
            messages={messages}
            imageWarning={null}
            openingMessage={interview?.openingMessage.content}
          />
        )}
        {tab === "diagram" && (
          <div className="final-diagram">
            <Whiteboard
              key="final"
              initialScene={whiteboard}
              onChange={() => {}}
              onInitialize={() => {}}
              readOnly
            />
          </div>
        )}
      </div>
      {interview?.sessionId && (
        <InterviewFeedbackCard
          key={interview.sessionId}
          interviewId={interview.sessionId}
        />
      )}
    </div>
  );
}
