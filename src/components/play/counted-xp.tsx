"use client";
import { useEffect, useState } from "react";
export function CountedXp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const fraction = Math.min(1, (now - start) / 260);
      setShown(Math.round(value * fraction));
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span aria-label={`${value} XP earned`}>
      <span aria-hidden="true">{shown.toLocaleString()} XP</span>
    </span>
  );
}
