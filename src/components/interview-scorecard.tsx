import {
  DESIGN_EXPLANATION_RULE,
  scoringMinimumInWords,
} from "@/lib/scoring-copy";
import Link from "next/link";
import type { ReactNode } from "react";
import { SCORE_LABELS, SIGNAL_LABELS, type Scorecard } from "@/lib/scorecard";
import type { Scene } from "@/lib/scene";
import { ScorecardEvidence } from "@/components/scorecard-evidence";
import { ShortInterviewResult } from "@/components/short-interview-result";

export function InterviewScorecard({
  scorecard,
  scene,
  children,
}: {
  scorecard: Scorecard;
  scene?: Scene;
  children?: ReactNode;
}) {
  if (scorecard.notScoredReason)
    return <ShortInterviewResult scorecard={scorecard} />;
  const consistency = scorecard.diagramConsistency?.map((f) => f.text) ?? [
    ...new Set(
      scorecard.areas.flatMap((a) =>
        a.diagramNote &&
        !/no explicit technology conflict|no labeled final diagram/iu.test(
          a.diagramNote,
        )
          ? [a.diagramNote]
          : [],
      ),
    ),
  ];
  if (
    scorecard.summary ===
    "You ended before giving a technical answer. Retry to get feedback."
  )
    return <p className="scorecard-empty">{scorecard.summary}</p>;
  const areaLabel = (score: number | null) =>
    score === null
      ? scorecard.session?.limited
        ? "Not enough evidence"
        : "Not assessed"
      : `${score}/4 · ${SCORE_LABELS[score as keyof typeof SCORE_LABELS]}`;
  const note =
    /^(?:Not enough evidence: scores are hidden|Scores show after you've used)/u.test(
      scorecard.session?.note ?? "",
    )
      ? `Scores need at least ${scoringMinimumInWords((scorecard.session?.allowedSeconds ?? 2700) / 60)}. ${DESIGN_EXPLANATION_RULE}`
      : scorecard.session?.note;
  return (
    <div className="scorecard-content">
      <section className="scorecard-summary" aria-labelledby="feedback-summary">
        <h2 id="feedback-summary">Interview scorecard</h2>
        <p className="scorecard-signal">
          Interview signal: {SIGNAL_LABELS[scorecard.signal]}
        </p>
        <p>{scorecard.summary}</p>
        {note && <p className="scorecard-note">{note}</p>}
      </section>
      <section aria-label="Scores by area" className="scorecard-overview">
        <h3>At a glance</h3>
        <p className="practice-muted">
          1 Needs work · 2 Developing · 3 Solid · 4 Strong. Unassessed areas
          have no score.
        </p>
        <ul>
          {scorecard.areas.map((area, i) => (
            <li key={area.area}>
              <a href={`#score-area-${i}`}>{area.area}</a>
              <span className="score-overview-rating">
                {area.score !== null && (
                  <span className="score-bars" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className={n <= area.score! ? "is-filled" : ""}
                      />
                    ))}
                  </span>
                )}
                <span>{areaLabel(area.score)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="scorecard-areas" aria-label="Area feedback">
        <h3>Your feedback</h3>
        {scorecard.areas.map((area, i) => (
          <article key={area.area} id={`score-area-${i}`}>
            <header>
              <h4>{area.area}</h4>
              <span className="practice-muted">{areaLabel(area.score)}</span>
            </header>
            <p>{area.rationale}</p>
            <ScorecardEvidence evidence={area.evidence} scene={scene} />
          </article>
        ))}
      </section>
      {consistency.length > 0 && (
        <section aria-label="Diagram consistency">
          <h3>Diagram consistency</h3>
          <ul>
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
          <h3>{kind === "strengths" ? "Strengths" : "Gaps to work on"}</h3>
          {scorecard[kind].length ? (
            <ul className="scorecard-findings">
              {scorecard[kind].map((finding, i) => (
                <li key={i}>
                  <p>{finding.text}</p>
                  <ScorecardEvidence
                    evidence={finding.evidence}
                    scene={scene}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="practice-muted">
              {kind === "strengths"
                ? "No strengths established from the available evidence yet."
                : "There is not enough evidence to identify demonstrated gaps."}
            </p>
          )}
        </section>
      ))}
      <section aria-label="Next practice" className="scorecard-next">
        <Link
          className="practice-secondary"
          href={`/interview/new?problem=${encodeURIComponent(scorecard.nextPractice.problemId)}`}
        >
          Next practice: {scorecard.nextPractice.title}
        </Link>
        <p>{scorecard.nextPractice.focus}</p>
      </section>
      {children && (
        <details>
          <summary>View interview transcript</summary>
          {children}
        </details>
      )}
    </div>
  );
}
