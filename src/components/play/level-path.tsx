import { levelUnlocked } from "@/lib/play/round-rules";
import { LockIcon, CheckIcon } from "./game-icons";
import { StartRound } from "./start-round";
import styles from "./level-path.module.css";
export function LevelPath({
  topic,
  levels,
  passed,
}: {
  topic: string;
  levels: readonly { level: number; title: string }[];
  passed: number[];
}) {
  const current = levels.find(
    (l) => !passed.includes(l.level) && levelUnlocked(l.level, levels, passed),
  )?.level;
  return (
    <ol className={styles.path} aria-label="Level path">
      {levels.map((level, index) => {
        const complete = passed.includes(level.level),
          open = levelUnlocked(level.level, levels, passed),
          state = complete
            ? "passed"
            : level.level === current
              ? "current"
              : open
                ? "open"
                : "locked";
        return (
          <li
            key={level.level}
            className={styles.step}
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span
              className={styles.node}
              aria-label={`Level ${level.level}: ${state}`}
            >
              {complete ? <CheckIcon /> : open ? level.level : <LockIcon />}
            </span>
            <div className={styles.card}>
              <div>
                <h2>{level.title}</h2>
                <p>5 drills. Pass with 4 correct answers.</p>
                {complete && <span className={styles.status}>Passed</span>}
              </div>
              {open ? (
                <StartRound
                  topic={topic}
                  mode="level"
                  level={level.level}
                  label={complete ? "Replay level" : "Start level"}
                  variant={complete ? "secondary" : "primary"}
                />
              ) : (
                <p className={styles.locked}>
                  <LockIcon /> Pass Level {levels[index - 1]?.level} to unlock
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
