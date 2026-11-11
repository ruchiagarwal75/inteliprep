import { INTERVIEW_STAGE_NAMES } from "@/lib/interview-stage-names";
export function PracticeStepper({
  names = INTERVIEW_STAGE_NAMES,
}: {
  names?: readonly string[];
}) {
  return (
    <section className="practice-journey" aria-labelledby="journey-title">
      <div className="section-heading">
        <h2 id="journey-title">The five stages</h2>
      </div>
      <ol className="stage-stepper">
        {names.map((step, i) => (
          <li key={step} aria-current={i === 0 ? "step" : undefined}>
            <span className="step-number">{i + 1}</span>
            <span className="stage-label">{step}</span>
            {i === 0 && (
              <span className="stage-begin">You&apos;ll begin here</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
