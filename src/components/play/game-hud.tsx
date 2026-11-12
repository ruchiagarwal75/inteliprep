"use client";
import type { PlayTotals } from "@/lib/play/public";
import { FlameIcon, StarIcon } from "./game-icons";
import { DailyGoal } from "./daily-goal";
import styles from "./game-hud.module.css";
export function GameHud({ totals }: { totals?: PlayTotals }) {
  const level = totals?.xpLevel;
  return (
    <div className={styles.hud} aria-label="Your progress">
      <span
        className={styles.flame}
        role="img"
        aria-label={
          totals ? `${totals.streak}-day streak` : "Streak unavailable"
        }
      >
        <FlameIcon />
        {totals?.streak ?? "Unavailable"}
      </span>
      <span className={styles.daily}>
        <DailyGoal complete={totals?.dailyGoal} />
        <span>Daily</span>
      </span>
      <span className={styles.xp} data-play-points-target>
        <StarIcon width="18" height="18" />
        {totals ? `${totals.points.toLocaleString()} XP` : "XP unavailable"}
      </span>
      <span className={styles.level}>
        {level ? (
          <>
            <strong>Lv {level.level}</strong>
            <span
              role="progressbar"
              aria-label={`Player level ${level.level} progress`}
              aria-valuemin={0}
              aria-valuemax={level.neededXp}
              aria-valuenow={level.currentXp}
              className={styles.track}
            >
              <span
                style={{
                  transform: `scaleX(${level.currentXp / level.neededXp})`,
                }}
              />
            </span>
            <span className={styles.next}>
              {level.neededXp - level.currentXp} XP to Lv {level.level + 1}
            </span>
          </>
        ) : (
          "Level unavailable"
        )}
      </span>
    </div>
  );
}
