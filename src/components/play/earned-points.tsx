"use client";
import { useEffect, useRef } from "react";
import styles from "./earned-points.module.css";
export function EarnedPoints({
  points,
  animate = false,
}: {
  points: number;
  animate?: boolean;
}) {
  const source = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (
      !animate ||
      points <= 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const target = document.querySelector("[data-play-points-target]");
    if (!source.current || !target) return;
    const from = source.current.getBoundingClientRect(),
      to = target.getBoundingClientRect(),
      token = document.createElement("span");
    token.className = styles.flight;
    token.textContent = `+${points}`;
    token.setAttribute("aria-hidden", "true");
    document.body.append(token);
    const flight = token.animate(
      [
        {
          transform: `translate(${from.left}px,${from.top}px) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate(${to.left}px,${to.top}px) scale(0.4)`,
          opacity: 0,
        },
      ],
      { duration: 650, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
    );
    void flight.finished.then(
      () => token.remove(),
      () => token.remove(),
    );
    return () => {
      flight.cancel();
      token.remove();
    };
  }, [animate, points]);
  if (points <= 0) return null;
  return (
    <p ref={source} className={styles.amount} role="status">
      +{points}
      <span> XP</span>
    </p>
  );
}
