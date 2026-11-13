import Image from "next/image";
import { RAG_COURSE_NODES } from "@/lib/play/course/metadata";
import { BossGate } from "./boss-gate";
import { InterviewerSprite } from "./interviewer-sprite";
import styles from "./welcome-learning-path.module.css";

const lastTopic = Math.max(...RAG_COURSE_NODES.map((topic) => topic.level));

/** An illustrated course journey, not a view of the player's saved progress. */
export function WelcomeLearningPath({
  layout,
}: {
  layout: "encounter" | "journey";
}) {
  const journey = layout === "journey";
  const start = { x: 18, y: journey ? 78 : 75 };
  const practice = { x: 50, y: 25 };
  const finish = { x: 82, y: journey ? 70 : 60 };
  const route = `M ${start.x} ${start.y} H 34 V ${practice.y} H 66 V ${finish.y} H ${finish.x}`;
  const at = (point: { x: number; y: number }) => ({
    left: `${point.x}%`,
    top: `${point.y}%`,
  });
  return (
    <div className={styles.map} data-learning-path={layout} aria-hidden="true">
      <svg
        className={styles.route}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path className={styles.edge} d={route} />
        <path className={styles.road} d={route} />
        <path className={styles.tiles} d={route} />
      </svg>
      <div className={styles.stop} style={at(start)} data-learning-stop="start">
        {journey && (
          <div className={styles.traveler}>
            <Image
              src="/brand/pixel/shardling-mark.svg"
              width={48}
              height={48}
              alt=""
            />
          </div>
        )}
        <span className={styles.startNode}>{RAG_COURSE_NODES[0].level}</span>
        <span className={styles.caption} data-learning-caption>
          {journey ? RAG_COURSE_NODES[0].title : "Learn"}
          {journey && <small>Start here</small>}
        </span>
      </div>
      <div
        className={styles.stop}
        style={at(practice)}
        data-learning-stop="practice"
      >
        <span className={styles.lessons}>
          <span />
          <span />
          <span>1</span>
        </span>
        <span className={styles.caption} data-learning-caption>
          Practice
          {journey && <small>Topics 1-{lastTopic}</small>}
        </span>
      </div>
      <div className={styles.stop} style={at(finish)} data-learning-stop="boss">
        <span className={styles.finish}>
          <BossGate scale={2} />
          <InterviewerSprite scale={journey ? 1 : 2} />
        </span>
        <span className={styles.caption} data-learning-caption>
          Boss
          {journey && <small>Mock interview</small>}
        </span>
      </div>
    </div>
  );
}
