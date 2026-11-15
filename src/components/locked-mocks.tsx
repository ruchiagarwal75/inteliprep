import Link from "next/link";
import type { ProblemSummary } from "@/lib/interview-selection";
import { isMockAvailable, RAG_BOSS } from "@/lib/mock-access-public";
import type { RagBossState } from "@/lib/rag-boss-public";
import { BossNode } from "./play/boss-node";
import { PixelSprite } from "./play/pixel-sprite";
import { PIXEL_ART } from "./play/pixel-art";
import styles from "./play/play.module.css";
import locks from "./locked-mocks.module.css";
import { MockTrialsProvider } from "./mock-trials-provider";
import { MockTrialRequest } from "./mock-trial-request";
import type { MockTrial } from "@/lib/mock-trial-public";

export function MockCatalog({
  problems,
  boss,
  trials = [],
}: {
  problems: ProblemSummary[];
  boss: RagBossState;
  trials?: MockTrial[];
}) {
  const rag = problems.find((problem) => isMockAvailable(problem.problemId));
  return (
    <MockTrialsProvider initial={trials}>
      <h1>Mock interviews</h1>
      <p>
        Earn your free RAG boss attempt on the learning path, or request a beta
        trial of a mock below.
      </p>
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
          {boss.plan === "free" && (
            <div className={styles.topic}>
              <div>
                <h3>Extra RAG mock access</h3>
                <span className={locks.badge}>Planned for Pro</span>
                <p>
                  A separate beta trial. Your earned boss attempt stays on the
                  learning path.
                </p>
              </div>
              <MockTrialRequest problemId={rag.problemId} />
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
                      Planned for Pro
                    </span>
                    <h3>{problem.title}</h3>
                    <p>{problem.summary}</p>
                  </div>
                  <MockTrialRequest problemId={problem.problemId} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </MockTrialsProvider>
  );
}
