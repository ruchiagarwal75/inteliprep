"use client";
import Mascot from "@/components/mascot-art/Mascot";
import { useMascotPreference } from "@/components/mascot-preference";
import styles from "./game-guide.module.css";
export function GameGuide({
  message,
  pose = "idle",
}: {
  message?: string;
  pose?: "idle" | "cheer" | "encourage" | "thinking" | "celebrate";
}) {
  const enabled = useMascotPreference();
  if (!enabled) return null;
  return (
    <aside
      className={styles.guide}
      data-pose={pose}
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
      </div>
      {message && <p className={styles.bubble}>{message}</p>}
    </aside>
  );
}
