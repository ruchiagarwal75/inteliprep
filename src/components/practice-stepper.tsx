import { HouseIcon } from "@/components/practice-icons";
const steps = [
  "Clarify requirements",
  "Draw and explain",
  "Core design",
  "Scaling and reliability",
  "Tradeoffs and wrap-up",
];
export function PracticeStepper() {
  return (
    <section className="practice-journey" aria-labelledby="journey-title">
      <div className="section-heading">
        <div>
          <p className="practice-kicker">One step at a time</p>
          <h2 id="journey-title">The five stages</h2>
        </div>
        <span className="practice-muted">You’ll begin here</span>
      </div>
      <ol className="house-stepper">
        {steps.map((step, i) => (
          <li key={step} aria-current={i === 0 ? "step" : undefined}>
            <HouseIcon lit={i === 0} />
            <span>
              <span className="step-number">0{i + 1}</span>
              {step}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
