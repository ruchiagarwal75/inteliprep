import Link from "next/link";
import type { ProblemSummary } from "@/lib/interview-selection";
import { isMockAvailable, RAG_BOSS } from "@/lib/mock-access-public";
import type { RagBossState } from "@/lib/rag-boss-public";
import { BossNode } from "./play/boss-node";
import { PixelSprite } from "./play/pixel-sprite";
import { PIXEL_ART } from "./play/pixel-art";
import styles from "./play/play.module.css";
import locks from "./locked-mocks.module.css";

export function MockCatalog({
  problems,
  boss,
}: {
  problems: ProblemSummary[];
  boss: RagBossState;
}) {
  const rag = problems.find((problem) => isMockAvailable(problem.problemId));
  return (
    <>
      <h1>Mock interviews</h1>
      <p>The RAG interview is open for beta. More mocks are coming soon.</p>
      <Link className="practice-link" href="/mock/history">
        Saved mock interviews
      </Link>
      {rag && (
        <section data-available-problem={rag.problemId}>
          {boss.plan === "free" ? (
            <BossNode boss={boss} standalone />
          ) : (
            <div className={styles.topic}>
              <div>
                <h2>{rag.title}</h2>
                <p>{rag.summary}</p>
              </div>
              <Link
                className="practice-primary"
                href={`/interview/new?problem=${RAG_BOSS.problemId}`}
              >
                Choose mock
              </Link>
            </div>
          )}
        </section>
      )}
      {(["genai", "core"] as const).map((track) => (
        <section
          className={styles.intro}
          id={track === "core" ? "fundamentals" : "ai-mocks"}
          key={track}
        >
          <h2>{track === "core" ? "Fundamentals" : "AI / ML system design"}</h2>
          <ul className={styles.topicList}>
            {problems
              .filter(
                (problem) =>
                  problem.track === track &&
                  !isMockAvailable(problem.problemId),
              )
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
                      Coming soon
                    </span>
                    <h3>{problem.title}</h3>
                    <p>{problem.summary}</p>
                  </div>
                  <button className="practice-secondary" disabled>
                    Locked
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
