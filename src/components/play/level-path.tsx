import { levelUnlocked } from "@/lib/play/round-rules";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import { StartRound } from "./start-round";
import { ChestNode } from "./chest-node";
import { Stars } from "./stars";
import { GameGuide } from "./game-guide";
import styles from "./level-path.module.css";
export function LevelPath({
  topic,
  levels,
  passed,
  stars = {},
  revealLevel,
  chests = {},
}: {
  topic: string;
  levels: readonly { level: number; title: string }[];
  passed: number[];
  stars?: Record<number, number>;
  revealLevel?: number;
  chests?: Record<number, number>;
}) {
  const current = levels.findIndex(
    (l) => !passed.includes(l.level) && levelUnlocked(l.level, levels, passed),
  );
  function track(mobile: boolean, segments: number) {
    const x = (i: number) =>
      i % 2 ? (mobile ? 360 : 450) : mobile ? 240 : 150;
    return (
      `M ${x(0)} 64` +
      levels
        .slice(1, segments + 1)
        .map(
          (_, i) => ` V ${i * 320 + 280} H ${x(i + 1)} V ${(i + 1) * 320 + 64}`,
        )
        .join("")
    );
  }
  return (
    <div className={styles.world}>
      {[false, true].map((mobile) => (
        <svg
          key={String(mobile)}
          className={`${styles.track} ${mobile ? styles.mobileTrack : styles.desktopTrack}`}
          viewBox={`0 0 600 ${levels.length * 320}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={track(mobile, levels.length - 1)}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={track(mobile, current < 0 ? levels.length - 1 : current)}
            vectorEffect="non-scaling-stroke"
            className={styles.filled}
          />
        </svg>
      ))}
      <ol className={styles.path} aria-label="Level path">
        {levels.map((level, index) => {
          const complete = passed.includes(level.level),
            open = levelUnlocked(level.level, levels, passed),
            state = complete
              ? "passed"
              : index === current
                ? "current"
                : open
                  ? "open"
                  : "locked";
          return (
            <li
              key={level.level}
              className={styles.step}
              data-state={state}
              data-side={index % 2}
              data-revealed={
                (state === "current" && revealLevel === level.level) ||
                undefined
              }
              aria-current={state === "current" ? "step" : undefined}
            >
              <details name="level-node" className={styles.details}>
                <summary
                  className={styles.node}
                  aria-label={`Level ${level.level}: ${level.title}, ${state}`}
                >
                  {state === "current" && revealLevel === level.level && (
                    <span className={styles.breakLock}>
                      <PixelSprite
                        art={PIXEL_ART.lock}
                        width="32"
                        height="32"
                      />
                    </span>
                  )}
                  {complete ? (
                    <PixelSprite art={PIXEL_ART.check} width="32" height="24" />
                  ) : open ? (
                    <span data-game-label>{level.level}</span>
                  ) : (
                    <PixelSprite art={PIXEL_ART.lock} width="32" height="32" />
                  )}
                </summary>
                <div className={styles.card}>
                  <h2>{level.title}</h2>
                  <Stars count={stars[level.level] ?? 0} />
                  <p>5 drills. Pass with 4 correct answers.</p>
                  {state === "current" ? (
                    <p>Start this level below.</p>
                  ) : open ? (
                    <StartRound
                      topic={topic}
                      mode="level"
                      level={level.level}
                      label={complete ? "Practice again" : "Start"}
                    />
                  ) : (
                    <p>Pass Level {levels[index - 1]?.level} to unlock.</p>
                  )}
                </div>
              </details>
              <div className={styles.caption}>
                <span data-game-label>LV {level.level}</span>
                <strong>{level.title}</strong>
                {complete && <Stars count={stars[level.level] ?? 0} />}
                {state === "current" && (
                  <StartRound
                    topic={topic}
                    mode="level"
                    level={level.level}
                    label="Start"
                  />
                )}
              </div>
              {state === "current" && (
                <div className={styles.guide}>
                  <GameGuide message={`Ready for LV ${level.level}?`} />
                </div>
              )}
              {index < levels.length - 1 && (
                <div className={styles.chest}>
                  <ChestNode
                    topic={topic}
                    afterLevel={level.level}
                    unlocked={complete}
                    openedXp={chests[level.level]}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
