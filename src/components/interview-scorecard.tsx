import Link from "next/link";
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
  children?: ReactNode;
}) {
  const consistency = scorecard.diagramConsistency?.map(
    (finding) => finding.text,
  ) ?? [
    ...new Set(
      scorecard.areas.flatMap((area) =>
        area.diagramNote &&
        !/no explicit technology conflict|no labeled final diagram/iu.test(
          area.diagramNote,
        )
          ? [area.diagramNote]
          : [],
      ),
    ),
  ];
  if (
    scorecard.summary ===
    "You ended before giving a technical answer. Retry to get feedback."
  )
    return <p className="p-4">{scorecard.summary}</p>;
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
                  ? scorecard.session?.limited
                    ? "Not enough evidence"
                    : "Not assessed"
                  : `${area.score}/4 · ${SCORE_LABELS[area.score as keyof typeof SCORE_LABELS]}`}
              </span>
            </div>
            <p className="mt-2 text-sm">{area.rationale}</p>
            <ScorecardEvidence evidence={area.evidence} scene={scene} />
          </article>
        ))}
      </section>
      {consistency.length > 0 && (
        <section aria-label="Diagram consistency">
          <h3 className="font-semibold">Diagram consistency</h3>
          <ul className="mt-2 list-inside list-disc space-y-2 text-sm">
            {consistency.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
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
                : "There is not enough evidence to identify demonstrated gaps."}
            </p>
          )}
        </section>
      ))}
      <section
        aria-label="Next practice"
        className="rounded-lg bg-black/5 p-3 dark:bg-white/10"
      >
        <Link
          className="inline-block rounded border px-3 py-2 text-sm font-semibold"
          href={`/interview/new?problem=${encodeURIComponent(scorecard.nextPractice.problemId)}`}
        >
          Next practice: {scorecard.nextPractice.title}
        </Link>
        <p className="mt-2 text-sm">{scorecard.nextPractice.focus}</p>
      </section>
      {children && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            View interview transcript
          </summary>
          <div className="mt-2 flex h-72 flex-col">{children}</div>
        </details>
      )}
    </div>
  );
}
