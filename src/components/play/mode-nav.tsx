"use client";
import { usePlayRewards } from "./play-rewards";
import { GameHud } from "./game-hud";
import Link from "next/link";
import styles from "./play.module.css";
export function ModeNav({
  active,
  points,
  streak,
}: {
  active: "play" | "mock" | "progress";
  points?: number;
  streak?: number;
}) {
  const rewards = usePlayRewards();
  points = rewards?.totals?.points ?? points;
  streak = rewards?.totals?.streak ?? streak;
  return (
    <div className={styles.modeBar}>
      <nav aria-label="Practice modes" className={styles.links}>
        {(["play", "mock", "progress"] as const).map((mode) => (
          <Link
            key={mode}
            href={`/${mode}`}
            aria-current={mode === active ? "page" : undefined}
          >
            {mode[0].toUpperCase() + mode.slice(1)}
          </Link>
        ))}
      </nav>
      <GameHud
        totals={
          rewards?.totals ??
          (points !== undefined && streak !== undefined
            ? { points, streak }
            : undefined)
        }
      />
    </div>
  );
}
