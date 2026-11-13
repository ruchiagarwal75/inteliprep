import Image from "next/image";
import { WelcomeLearningPath } from "./welcome-learning-path";
import { PixelMascot } from "./pixel-mascot";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
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
      {(panel === 3 || panel === 4) && (
        <WelcomeLearningPath layout={panel === 3 ? "encounter" : "journey"} />
      )}
      {panel === 1 && (
        <div className={styles.shardling}>
          <Image
            src="/brand/pixel/shardling-mark.svg"
            width={144}
            height={144}
            alt=""
            priority
          />
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
      <div className={styles.ground} />
    </div>
  );
}
