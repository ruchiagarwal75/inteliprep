import type { ReactNode } from "react";
import ScalingStory from "@/components/scaling-story/ScalingStory";

export function PracticeHero({
  brief = false,
  children,
}: {
  brief?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      className={[
        "practice-hero",
        brief ? "practice-hero-brief" : "practice-hero-home",
      ].join(" ")}
      aria-labelledby="practice-title"
    >
      <div className="practice-hero-copy">
        {!brief && (
          <p className="practice-eyebrow">System design, at your own pace</p>
        )}
        <h1 id="practice-title">
          {brief
            ? "Your practice brief"
            : "Mock system design interviews, out loud, with a whiteboard."}
        </h1>
        <p className="practice-hero-description">
          {brief
            ? "Pick a problem and read it through. The timer starts when you click Start."
            : "Talk it through, sketch your approach, and leave with something to build on."}
        </p>
        {children}
      </div>
      {!brief && (
        <div className="home-scaling-story">
          <ScalingStory showControls={false} />
        </div>
      )}
    </section>
  );
}
