"use client";
import { useEffect, useState } from "react";
import styles from "./round-summary.module.css";
export function PassConfetti() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const show = window.setTimeout(() => setVisible(true), 0),
      hide = window.setTimeout(() => setVisible(false), 1400);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);
  if (!visible) return null;
  return (
    <div className={styles.confetti} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <i
          key={index}
          style={{
            left: `${8 + index * 7}%`,
            animationDelay: `${(index % 4) * 65}ms`,
            transform: `rotate(${index * 37}deg)`,
          }}
        />
      ))}
    </div>
  );
}
