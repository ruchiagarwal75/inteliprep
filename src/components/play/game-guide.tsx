"use client";
import { useSyncExternalStore } from "react";
import { PixelMascot } from "./pixel-mascot";
import { useMascotPreference } from "@/components/mascot-preference";
import styles from "./game-guide.module.css";
const subscribe = (changed: () => void) => {
  document.addEventListener("visibilitychange", changed);
  return () => document.removeEventListener("visibilitychange", changed);
};
const hidden = () => document.hidden;
const visibleOnServer = () => false;
/** Play-only pixel sprite. The original non-Play mascot remains unchanged. */
export function GameGuide({
  message,
  pose = "idle",
}: {
  message?: string;
  pose?: "idle" | "cheer" | "encourage" | "thinking" | "celebrate";
}) {
  const enabled = useMascotPreference(),
    paused = useSyncExternalStore(subscribe, hidden, visibleOnServer);
  if (!enabled) return null;
  return (
    <aside
      className={styles.guide}
      data-pose={pose}
      data-paused={paused || undefined}
      aria-label="Practice guide"
    >
      <div className={styles.art}>
        <PixelMascot pose={pose} />
      </div>
      {message && <p className={styles.bubble}>{message}</p>}
    </aside>
  );
}
