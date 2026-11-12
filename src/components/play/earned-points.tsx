"use client";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import styles from "./earned-points.module.css";
export function EarnedPoints({
  points,
  animate = false,
}: {
  points: number;
  animate?: boolean;
}) {
  if (points <= 0) return null;
  return (
    <p
      className={styles.amount}
      data-animate={animate || undefined}
      role="status"
      data-game-label
    >
      <PixelSprite art={PIXEL_ART.star} width="27" height="21" />+{points}
      <span> XP</span>
    </p>
  );
}
