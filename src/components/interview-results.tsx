"use client";
import Link from "next/link";
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
    <div className="flex min-h-0 flex-1 flex-col">
      <ResultsMascot scorecard={scorecard} ready={!busy && !closed} />
      <header className="shrink-0 space-y-3 border-b p-3">
        <h2 className="text-lg font-semibold">Interview results</h2>
        {used && (
          <p>
            Time used: {formatInterviewTime(used.elapsedSeconds)} of{" "}
            {formatInterviewTime(used.allowedSeconds)}
          </p>
        )}
        <nav className="flex flex-wrap gap-2" aria-label="Next practice">
          <Link
            className="bg-brand text-brand-foreground rounded px-3 py-2 text-sm"
            href={brief()}
          >
            Retry this problem
          </Link>
          <Link
            className="rounded border px-3 py-2 text-sm"
            href={brief(scorecard?.nextPractice.problemId)}
          >
            Try suggested problem
          </Link>
          <Link className="rounded border px-3 py-2 text-sm" href="/">
            Back to home
          </Link>
        </nav>
        <div
          role="tablist"
          aria-label="Interview results"
          className="flex gap-2"
        >
          {(["scorecard", "transcript", "diagram"] as const).map((t) => (
            <button
              key={t}
              id={`results-tab-${t}`}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`results-${t}`}
              className="rounded border px-3 py-2 text-sm aria-selected:underline"
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
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {tab === "scorecard" &&
          (scorecard ? (
            <InterviewScorecard scorecard={scorecard} scene={scene} />
          ) : (
            <div className="p-4">
              <p role={error && !busy ? "alert" : "status"}>
                {closed
                  ? "Closed without scoring. Your transcript and diagram are saved."
                  : busy
                    ? "Generating your scorecard…"
                    : (error ??
                      "Your interview has ended. Generate its scorecard to see feedback.")}
              </p>
              {!closed && !busy && (
                <button
                  className="mt-3 rounded border px-3 py-2"
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
          />
        )}
        {tab === "diagram" && (
          <Whiteboard
            key="final"
            initialScene={whiteboard}
            onChange={() => {}}
            onInitialize={() => {}}
            readOnly
          />
        )}
      </div>
    </div>
  );
}
