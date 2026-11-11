"use client";
import Mascot from "@/components/mascot-art/Mascot";
import { useMascotPreference } from "@/components/mascot-preference";
import { GRADING_STEPS, type GradingStage } from "@/lib/grading-progress";
import styles from "./scorecard-loading.module.css";

/** Only server events change the current step. */
export function ScorecardLoading({ stage }: { stage?: GradingStage }) {
  const mascot = useMascotPreference();
  const current = GRADING_STEPS.findIndex((step) => step.id === stage);
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
          Your transcript and final diagram stay available while we prepare
          feedback.
        </p>
        <ol className={styles.steps} aria-label="Scorecard progress">
          {GRADING_STEPS.map((step, index) => (
            <li
              key={step.id}
              className={`${styles.step} ${index === current ? styles.current : ""}`}
              aria-current={index === current ? "step" : undefined}
            >
              <span className={styles.number} aria-hidden="true">
                {index < current ? "✓" : index + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>
        <span className="sr-only" role="status" aria-live="polite">
          {GRADING_STEPS[current]?.label ?? "Preparing your feedback"}
        </span>
      </div>
    </section>
  );
}
