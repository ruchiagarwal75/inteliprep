"use client";
import { useEffect, useState } from "react";
import type { DrillQuestion, DrillResult } from "@/lib/play/public";
import styles from "./drill.module.css";
export function SoftTimer({
  question,
  result,
  resumed,
  busy,
}: {
  question: DrillQuestion;
  result?: DrillResult;
  resumed?: boolean;
  busy: boolean;
}) {
  const [offset] = useState(() => Date.parse(question.serverNow) - Date.now()),
    [now, setNow] = useState(() => Date.parse(question.serverNow));
  useEffect(() => {
    if (result || busy) return;
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset, result, busy]);
  const seconds = Math.max(
    0,
    Math.floor(
      (result ? result.timeMs : now - Date.parse(question.startedAt)) / 1000,
    ),
  );
  return (
    <span className={styles.timer} aria-label="Time on this drill">
      {String(Math.floor(seconds / 60)).padStart(2, "0")}:
      {String(seconds % 60).padStart(2, "0")}
      <span> No hard stop{resumed ? " · Resumed" : ""}</span>
    </span>
  );
}
