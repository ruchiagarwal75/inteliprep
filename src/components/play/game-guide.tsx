"use client";
import { useSyncExternalStore } from "react";
import Mascot from "@/components/mascot-art/Mascot";
import { useMascotPreference } from "@/components/mascot-preference";
import styles from "./game-guide.module.css";
const subscribe = (changed: () => void) => {
  document.addEventListener("visibilitychange", changed);
  return () => document.removeEventListener("visibilitychange", changed);
};
const hidden = () => document.hidden;
const visibleOnServer = () => false;
/** Reuses the exact original SVG artwork. Only pose motion and a thought bubble vary. */
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
        <Mascot
          pose={
            pose === "thinking"
              ? "working"
              : pose === "cheer" || pose === "celebrate"
                ? "done"
                : "wave"
          }
        />
        {pose === "thinking" && (
          <span className={styles.thought} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
      {message && <p className={styles.bubble}>{message}</p>}
    </aside>
  );
}
