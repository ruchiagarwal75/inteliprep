import Link from "next/link";
import type { ProblemSummary } from "@/lib/interview-selection";
import { RAG_BOSS } from "@/lib/mock-access-public";
import { ProInterestButton } from "./pro-interest-button";
import { PixelSprite } from "./play/pixel-sprite";
import { PIXEL_ART } from "./play/pixel-art";
import styles from "./play/play.module.css";
import locks from "./locked-mocks.module.css";
export function LockedMocks({
  problems,
  interested,
}: {
  problems: ProblemSummary[];
  interested: boolean;
}) {
  return (
    <>
      <h1>Mock interviews</h1>
      <p>
        Your RAG World includes one free boss attempt. Other mocks need Pro.
      </p>
      <Link className="practice-link" href="/mock/history">
        Saved mock interviews
      </Link>
      {(["genai", "core"] as const).map((track) => (
        <section className={styles.intro} key={track}>
          <h2>{track === "core" ? "Fundamentals" : "AI / ML system design"}</h2>
          <ul className={styles.topicList}>
            {problems
              .filter((problem) => problem.track === track)
              .map((problem) => (
                <li
                  key={problem.problemId}
                  className={styles.topic}
                  data-locked-problem={problem.problemId}
                >
                  <div>
                    <span className={locks.badge}>
                      <PixelSprite
                        art={PIXEL_ART.lock}
                        width="16"
                        height="16"
                      />
                      Pro
                    </span>
                    <h3>{problem.title}</h3>
                    <p>{problem.summary}</p>
                    {problem.problemId === RAG_BOSS.problemId && (
                      <Link className="practice-link" href={RAG_BOSS.href}>
                        Free once as the RAG World boss
                      </Link>
                    )}
                  </div>
                  <ProInterestButton interested={interested} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
