import type { ReactNode } from "react";
import { ArchitectureHero } from "@/components/architecture-hero";

export function PracticeHero({
  brief = false,
  children,
}: {
  brief?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      className={["practice-hero", brief ? "practice-hero-brief" : ""].join(
        " ",
      )}
      aria-labelledby="practice-title"
    >
      {!brief && <ArchitectureHero />}
      <div className="practice-hero-copy">
        <p className="practice-eyebrow">
          {brief ? "A moment to get ready" : "System design, at your own pace"}
        </p>
        <h1 id="practice-title">
          {brief ? (
            "Your practice brief"
          ) : (
            <>
              A little practice.
              <br />A clearer mind.
            </>
          )}
        </h1>
        <p className="practice-hero-description">
          {brief
            ? "Choose a challenge. Read it through. The clock can wait until you’re ready."
            : "Talk it through, sketch your approach, and leave with something to build on."}
        </p>
        {children}
      </div>
    </section>
  );
}
