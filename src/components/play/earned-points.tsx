"use client";
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
    >
      +{points}
      <span> XP</span>
    </p>
  );
}
