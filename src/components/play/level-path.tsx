import { levelUnlocked } from "@/lib/play/round-rules";
import { LockIcon, CheckIcon } from "./game-icons";
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
  chests = {},
}: {
  topic: string;
  levels: readonly { level: number; title: string }[];
  passed: number[];
  stars?: Record<number, number>;
  chests?: Record<number, number>;
}) {
  const current = levels.findIndex(
    (l) => !passed.includes(l.level) && levelUnlocked(l.level, levels, passed),
  );
  const x = (i: number) => (i % 2 === 0 ? 210 : 390);
  const curve = (i: number) =>
    ` C ${x(i)} ${i * 240 + 184} ${x(i + 1)} ${i * 240 + 184} ${x(i + 1)} ${(i + 1) * 240 + 64}`;
  const start = `M ${x(0)} 64`,
    path =
      start +
      levels
        .slice(1)
        .map((_, i) => curve(i))
        .join("");
  const filled =
    start +
    levels
      .slice(1, current < 0 ? levels.length : current + 1)
      .map((_, i) => curve(i))
      .join("");
  return (
    <div className={styles.world}>
      <svg
        className={styles.track}
        viewBox={`0 0 600 ${levels.length * 240}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={path} />
        <path d={filled} className={styles.filled} />
      </svg>
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
              aria-current={state === "current" ? "step" : undefined}
            >
              <details name="level-node" className={styles.details}>
                <summary
                  className={styles.node}
                  aria-label={`Level ${level.level}: ${level.title}, ${state}`}
                >
                  {complete ? (
                    <CheckIcon width="36" height="36" />
                  ) : open ? (
                    level.level
                  ) : (
                    <LockIcon width="28" height="28" />
                  )}
                </summary>
                <div className={styles.card}>
                  <h2>{level.title}</h2>
                  <Stars count={stars[level.level] ?? 0} />
                  <p>5 drills. Pass with 4 correct answers.</p>
                  {open ? (
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
                <span>Level {level.level}</span>
                {complete && <Stars count={stars[level.level] ?? 0} />}
              </div>
              {state === "current" && (
                <div className={styles.guide}>
                  <GameGuide message={`Ready for Level ${level.level}?`} />
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
