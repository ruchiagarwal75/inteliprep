"use client";
import type { PlayTotals } from "@/lib/play/public";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import { DailyGoal } from "./daily-goal";
import { filledBlocks, SegmentedBar } from "./segmented-bar";
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
        <PixelSprite art={PIXEL_ART.flame} width="14" height="18" />
        <span data-game-label={totals ? true : undefined}>
          {totals?.streak ?? "Unavailable"}
        </span>
      </span>
      <span className={styles.daily}>
        <DailyGoal complete={totals?.dailyGoal} />
        <span data-game-label>Daily</span>
      </span>
      <span className={styles.xp} data-play-points-target>
        <span className={styles.star}>
          <PixelSprite art={PIXEL_ART.star} width="18" height="14" />
        </span>
        <span data-game-label={totals ? true : undefined}>
          {totals
            ? `${totals.points.toLocaleString("en-US")} XP`
            : "XP unavailable"}
        </span>
      </span>
      <span className={styles.level}>
        {level ? (
          <>
            <strong data-game-label>LV {level.level}</strong>
            <span className={styles.track}>
              <SegmentedBar
                states={Array.from({ length: 10 }, (_, i) =>
                  i < filledBlocks(level.currentXp, level.neededXp, 10)
                    ? "done"
                    : "empty",
                )}
                label={`Player level ${level.level} progress`}
                value={level.currentXp}
                max={level.neededXp}
              />
            </span>
            <span className={styles.next}>
              {level.neededXp - level.currentXp} XP to LV {level.level + 1}
            </span>
          </>
        ) : (
          "Level unavailable"
        )}
      </span>
    </div>
  );
}
