import Image from "next/image";
import { BossGate } from "./boss-gate";
import { InterviewerSprite } from "./interviewer-sprite";
import { PixelMascot } from "./pixel-mascot";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import { TopicIcon } from "./topic-icon";
import styles from "./welcome-intro.module.css";
const stars = [
  [8, 16],
  [22, 30],
  [39, 12],
  [61, 25],
  [78, 12],
  [91, 36],
  [53, 41],
  [12, 57],
];
export function WelcomeScene({ panel }: { panel: number }) {
  return (
    <div className={styles.scene} data-scene={panel} aria-hidden="true">
      <div className={styles.stars}>
        {stars.map(([x, y], i) => (
          <span
            key={i}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `-${i / 3}s`,
            }}
          />
        ))}
      </div>
      {(panel === 3 || panel === 4) && <div className={styles.path} />}
      {panel === 3 && (
        <div className={styles.worlds}>
          {(
            [
              ["rag", "RAG"],
              ["chat-serving", "Chat and serving"],
              ["agents", "Agents"],
            ] as const
          ).map(([topic, label], i) => (
            <div key={topic} data-world={topic}>
              <TopicIcon topic={topic} locked={i > 0} />
              <span>{label}</span>
              {i > 0 && <small>Soon</small>}
            </div>
          ))}
        </div>
      )}
      {(panel === 1 || panel === 4) && (
        <div className={styles.shardling}>
          <Image
            src="/brand/pixel/shardling-mark.svg"
            width={panel === 1 ? 144 : 96}
            height={panel === 1 ? 144 : 96}
            alt=""
            priority
          />
        </div>
      )}
      {panel === 3 && (
        <div className={styles.encounter}>
          <BossGate scale={4} />
          <div className={styles.bossArrival}>
            <InterviewerSprite scale={3} />
          </div>
        </div>
      )}
      {panel === 2 && (
        <>
          <div className={styles.guide}>
            <PixelMascot pose="cheer" />
          </div>
          <div className={styles.treasure}>
            <span className={styles.xp}>XP</span>
            <div className={styles.threeStars}>
              {[1, 2, 3].map((i) => (
                <PixelSprite
                  key={i}
                  art={PIXEL_ART.star}
                  width={27}
                  height={21}
                />
              ))}
            </div>
            <PixelSprite art={PIXEL_ART.chest} width={72} height={54} />
          </div>
        </>
      )}
      {panel === 4 && (
        <>
          <span className={styles.startFlag}>RAG</span>
          <div className={styles.farGate}>
            <BossGate scale={2} />
            <InterviewerSprite scale={1} />
          </div>
        </>
      )}
      <div className={styles.ground} />
    </div>
  );
}
