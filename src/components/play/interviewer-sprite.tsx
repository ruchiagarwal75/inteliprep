"use client";
import { useSyncExternalStore } from "react";
import { compileSprite } from "./pixel-grid";
import { BOSS_GRIDS } from "./boss-art";
import styles from "./interviewer-sprite.module.css";
export const BOSS_LINES = {
  intro: "Show me what you'd build, and why.",
  confirm: "45 minutes. No hints. Show me your design.",
  defeated: "Hmm. Not bad. You're ready.",
  notPassed: "Close. Train more, then come back.",
} as const;
const names = {
  K: "outline",
  H: "hair",
  B: "brows",
  S: "skin",
  s: "skin-shade",
  G: "glasses",
  L: "lens",
  W: "white",
  g: "glint",
  M: "mouth",
  J: "jacket",
  j: "jacket-shade",
  T: "shirt",
  R: "marker",
  D: "sweat",
};
export const BOSS_PALETTE = Object.fromEntries(
  Object.entries(names).map(([key, name]) => [key, `var(--boss-${name})`]),
);
const idleBase = BOSS_GRIDS.idle.map((row, y) =>
  [...row]
    .map((cell) => (cell === "g" || (y === 12 && cell === "W") ? "L" : cell))
    .join(""),
);
const idle = compileSprite(idleBase, BOSS_PALETTE);
const glints = compileSprite(
  BOSS_GRIDS.idle.map((row) => row.replace(/[^g]/gu, ".")),
  BOSS_PALETTE,
);
const eyes = compileSprite(
  BOSS_GRIDS.idle.map((row, y) =>
    y === 12 ? row.replace(/[^W]/gu, ".") : ".".repeat(32),
  ),
  BOSS_PALETTE,
);
const defeated = compileSprite(BOSS_GRIDS.defeated, BOSS_PALETTE);
const subscribe = (changed: () => void) => {
  document.addEventListener("visibilitychange", changed);
  return () => document.removeEventListener("visibilitychange", changed);
};
const hidden = () => document.hidden;
const server = () => false;
const pixels = (art: ReturnType<typeof compileSprite>) =>
  art.paths.map((path) => (
    <path key={path.color} d={path.d} fill={path.color} />
  ));
export function InterviewerSprite({
  pose = "idle",
  scale = 3,
}: {
  pose?: "idle" | "defeated";
  scale?: 1 | 2 | 3 | 4;
}) {
  const paused = useSyncExternalStore(subscribe, hidden, server);
  return (
    <svg
      className={styles.sprite}
      data-paused={paused || undefined}
      data-boss-pose={pose}
      width={32 * scale}
      height={32 * scale}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pose === "defeated" ? (
        pixels(defeated)
      ) : (
        <>
          {pixels(idle)}
          <g className={styles.glints}>{pixels(glints)}</g>
          <g className={styles.eyes}>{pixels(eyes)}</g>
        </>
      )}
    </svg>
  );
}
