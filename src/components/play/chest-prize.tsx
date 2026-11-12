"use client";
import { createPortal } from "react-dom";
import { PixelChest } from "./pixel-chest";
import styles from "./chest-prize.module.css";
export const CHEST_CELEBRATION_MS = 1200;
/** Visual echo of the server award. The chest's persistent status already announces it. */
export function ChestPrize({ xp }: { xp: number }) {
  return createPortal(
    <div className={styles.overlay} data-chest-prize aria-hidden="true">
      <div className={styles.panel}>
        <div className={styles.chest}>
          <PixelChest open animate />
        </div>
        <span className={styles.burst}>
          {Array.from({ length: 8 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${12 + ((i * 31) % 80)}%`,
                animationDelay: `${200 + (i % 3) * 40}ms`,
              }}
            />
          ))}
        </span>
        <strong>+{xp} XP</strong>
      </div>
    </div>,
    document.body,
  );
}
