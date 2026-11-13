import Link from "next/link";
import type { RagBossState } from "@/lib/rag-boss-public";
import { BossGate } from "./boss-gate";
import { InterviewerSprite, BOSS_LINES } from "./interviewer-sprite";
import { BossStart } from "./boss-start";
import { ProInterestButton } from "@/components/pro-interest-button";
import styles from "./boss.module.css";
export function BossNode({ boss }: { boss: RagBossState }) {
  const result = "result" in boss ? boss.result : null;
  return (
    <section
      id="rag-boss"
      className={styles.node}
      data-boss-state={boss.state}
      aria-labelledby="rag-boss-title"
    >
      <div className={styles.art}>
        <BossGate open={boss.state === "defeated"} scale={4} />
        <InterviewerSprite
          pose={boss.state === "defeated" ? "defeated" : "idle"}
          scale={3}
        />
      </div>
      <h2 id="rag-boss-title" data-game-label>
        Final boss: Design an enterprise RAG assistant
      </h2>
      <p>Mid level · 45 min</p>
      {result && (
        <p>
          Score:{" "}
          {result.score === null
            ? result.signal === "insufficient_evidence"
              ? "Too short to score"
              : "Not available yet"
            : `${Math.round(result.score * 100)}%`}
        </p>
      )}
      {boss.state === "locked" && <p>Pass Topic 9 to unlock</p>}
      {boss.state === "ready" && (
        <>
          <p>
            {boss.plan === "free" ? "One free attempt" : "Included with Pro"}
          </p>
          <BossStart free={boss.plan === "free"} />
        </>
      )}
      {boss.state === "in_progress" && (
        <Link
          className="practice-primary"
          href={`/interview/${boss.sessionId}`}
        >
          Resume boss
        </Link>
      )}
      {(boss.state === "used" || boss.state === "retry") && (
        <>
          <p className={styles.dialogue}>{BOSS_LINES.notPassed}</p>
          <div className={styles.actions}>
            {boss.state === "used" ? (
              <ProInterestButton label="Retry with Pro" primary />
            ) : (
              <BossStart free={false} retry />
            )}
            {result && (
              <Link
                className="practice-secondary"
                href={`/interview/${result.sessionId}/results`}
              >
                View scorecard
              </Link>
            )}
          </div>
        </>
      )}
      {boss.state === "defeated" && (
        <>
          <h3 data-game-label>Boss defeated</h3>
          <p>
            <time dateTime={boss.defeatedAt}>
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(new Date(boss.defeatedAt))}
            </time>
          </p>
          <p className={styles.dialogue}>{BOSS_LINES.defeated}</p>
          <Link
            className="practice-primary"
            href={`/interview/${boss.result.sessionId}/results`}
          >
            View scorecard
          </Link>
        </>
      )}
    </section>
  );
}
