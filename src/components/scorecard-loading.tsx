"use client";
import Mascot from "@/components/mascot-art/Mascot";
import { useMascotPreference } from "@/components/mascot-preference";

/** The grading API has no step events, so do not pretend to report completed steps. */
export function ScorecardLoading() {
  const mascot = useMascotPreference();
  return (
    <section className="scorecard-loading" aria-label="Preparing your feedback">
      {mascot && (
        <div className="scorecard-loading-mascot" aria-hidden="true">
          <Mascot pose="working" />
        </div>
      )}
      <div>
        <h2>Generating your scorecard…</h2>
        <p>
          We&apos;re reviewing your answers and drawing. This can take up to two
          minutes.
        </p>
        <div
          className="scorecard-progress"
          role="progressbar"
          aria-label="Generating feedback"
        >
          <span />
        </div>
        <p className="practice-muted">
          Your feedback covers the transcript, the final diagram, and the
          tradeoffs you discussed. You can review the other tabs while you wait.
        </p>
        <span className="sr-only" role="status">
          Generating your scorecard
        </span>
      </div>
    </section>
  );
}
