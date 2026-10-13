import type { ReactNode } from "react";
import { SCORE_LABELS, SIGNAL_LABELS, type Scorecard } from "@/lib/scorecard";
import { INTERVIEW_LEVEL_LABELS } from "@/lib/interview-selection";
import type { Scene } from "@/lib/scene";
import { ScorecardEvidence } from "@/components/scorecard-evidence";
import { formatInterviewTime } from "@/lib/interview-timer";

export function InterviewScorecard({
  scorecard,
  scene,
  children,
}: {
  scorecard: Scorecard;
  scene?: Scene;
  children: ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 break-words">
      <div>
        <h2 className="text-lg font-semibold">Interview scorecard</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {scorecard.problemTitle} · {INTERVIEW_LEVEL_LABELS[scorecard.level]}
        </p>
        <p className="mt-3 text-sm font-medium">
          Interview signal: {SIGNAL_LABELS[scorecard.signal]}
        </p>
        <p className="mt-2 text-sm">{scorecard.summary}</p>
        {scorecard.session && (
          <div className="mt-3 rounded border border-black/15 p-3 text-xs dark:border-white/15">
            <p className="font-medium">
              Time used: {formatInterviewTime(scorecard.session.elapsedSeconds)}{" "}
              of {formatInterviewTime(scorecard.session.allowedSeconds)}
            </p>
            <p className="mt-1">{scorecard.session.note}</p>
          </div>
        )}
      </div>
      <section aria-label="Scores by area" className="space-y-3">
        <h3 className="font-semibold">Scores by area</h3>
        <p className="text-xs text-black/60 dark:text-white/60">
          1 Needs work · 2 Developing · 3 Solid · 4 Strong. Unassessed areas
          have no score.
        </p>
        {scorecard.areas.map((area) => (
          <article
            key={area.area}
            className="rounded-lg border border-black/10 p-3 dark:border-white/15"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-medium">{area.area}</h4>
              <span className="shrink-0 rounded-md bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
                {area.score === null
                  ? "Not assessed"
                  : `${area.score}/4 · ${SCORE_LABELS[area.score as keyof typeof SCORE_LABELS]}`}
              </span>
            </div>
            <p className="mt-2 text-sm">{area.rationale}</p>
            <ScorecardEvidence evidence={area.evidence} scene={scene} />
          </article>
        ))}
      </section>
      {(["strengths", "gaps"] as const).map((kind) => (
        <section
          key={kind}
          aria-label={kind === "strengths" ? "Strengths" : "Gaps"}
        >
          <h3 className="font-semibold">
            {kind === "strengths" ? "Strengths" : "Gaps to work on"}
          </h3>
          {scorecard[kind].length ? (
            <ul className="mt-2 space-y-3">
              {scorecard[kind].map((finding, index) => (
                <li key={index}>
                  <p className="text-sm">{finding.text}</p>
                  <ScorecardEvidence
                    evidence={finding.evidence}
                    scene={scene}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              {kind === "strengths"
                ? "No strengths established from the available evidence yet."
                : "No demonstrated gaps identified in the available evidence."}
            </p>
          )}
        </section>
      ))}
      <section
        aria-label="Next practice"
        className="rounded-lg bg-black/5 p-3 dark:bg-white/10"
      >
        <h3 className="text-sm font-semibold">
          Next practice: {scorecard.nextPractice.title}
        </h3>
        <p className="mt-2 text-sm">{scorecard.nextPractice.focus}</p>
      </section>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          View interview transcript
        </summary>
        <div className="mt-2 flex h-72 flex-col">{children}</div>
      </details>
    </div>
  );
}
