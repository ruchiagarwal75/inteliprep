"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { PlayTotals } from "@/lib/play/public";
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
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${game.game}`}
      data-world={world}
      aria-labelledby="player-level-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className={styles.content}>
        <div className={styles.hero}>
          <span className={styles.burst} aria-hidden="true" />
          <div className={styles.guide}>
            <GameGuide pose="celebrate" />
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
        <h1 id="player-level-title">Level up!</h1>
        <p
          className={styles.badge}
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
