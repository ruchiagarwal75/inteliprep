"use client";
import { usePathname } from "next/navigation";
import game from "./game.module.css";
import { useEffect, useRef } from "react";
import { GameGuide } from "./game-guide";
import styles from "./level-up.module.css";
export function LevelUp({
  level,
  onClose,
}: {
  level: number;
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
        <GameGuide pose="celebrate" />
        <p className={styles.spark}>New player level</p>
        <h1 id="player-level-title">Level up!</h1>
        <p className={styles.level}>You&apos;re now Lv {level}</p>
        <p>Keep building your skills.</p>
        <button autoFocus className="practice-primary" onClick={onClose}>
          Continue
        </button>
      </div>
    </dialog>
  );
}
