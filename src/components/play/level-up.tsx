"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { PlayTotals } from "@/lib/play/public";
import pixel from "./pixel.module.css";
import { playGameSound } from "./game-sounds";
import game from "./game.module.css";
import { GameGuide } from "./game-guide";
import styles from "./level-up.module.css";
const colors = ["var(--game-world)", "var(--amber)", "var(--game-chest)"];
export function LevelUp({
  progress,
  onClose,
}: {
  progress: NonNullable<PlayTotals["xpLevel"]>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const world = usePathname().split("/")[2] || "rag";
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    playGameSound("levelup");
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${game.game} ${pixel.page}`}
      data-world={world}
      data-pixel-play
      aria-labelledby="player-level-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className={styles.content}>
        <div className={styles.hero}>
          <span className={styles.burst} aria-hidden="true" />
          <div className={styles.guide}>
            <GameGuide size="large" pose="celebrate" />
          </div>
        </div>
        <div className={styles.confetti} aria-hidden="true" data-confetti>
          {Array.from({ length: 16 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${8 + ((i * 37) % 85)}%`,
                animationDelay: `${(i % 4) * 70}ms`,
                background: colors[i % colors.length],
              }}
            />
          ))}
        </div>
        <h1 id="player-level-title" data-game-label>
          Level up!
        </h1>
        <p
          className={styles.badge}
          data-game-label
          aria-label={`You're now Lv ${progress.level}`}
        >
          <span>Lv</span>
          <strong>{progress.level}</strong>
        </p>
        <p className={styles.next}>
          Next: Lv {progress.level + 1} at{" "}
          {new Intl.NumberFormat("en-US").format(progress.nextXp)} XP
        </p>
        <button autoFocus className="practice-primary" onClick={onClose}>
          Continue
        </button>
      </div>
    </dialog>
  );
}
