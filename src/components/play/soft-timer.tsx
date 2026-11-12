"use client";
import { useEffect, useState } from "react";
import type { DrillQuestion, DrillResult } from "@/lib/play/public";
import { drillActivityResultSchema } from "@/lib/play/public";
import { DRILL_HEARTBEAT_MS, formatDrillTime } from "@/lib/play/drill-time";
import { useCandidateAccount } from "@/components/candidate-account-context";
import styles from "./drill.module.css";
export function SoftTimer({
  question,
  result,
  resumed,
  busy,
  onRefresh,
}: {
  question: DrillQuestion;
  result?: DrillResult;
  resumed?: boolean;
  busy: boolean;
  onRefresh?: () => void;
}) {
  const { request } = useCandidateAccount();
  const [elapsedMs, setElapsedMs] = useState(question.elapsedMs ?? 0);
  const cap = question.maxTimeMs ?? Number.MAX_SAFE_INTEGER;
  useEffect(() => {
    if (result || busy) return;
    let base = question.elapsedMs ?? 0,
      at = performance.now(),
      visible = !document.hidden,
      disposed = false,
      refreshing = false;
    let queue = Promise.resolve();
    const value = () =>
      Math.min(cap, base + (visible ? performance.now() - at : 0));
    const pulse = (show: boolean) => {
      queue = queue.then(async () => {
        if (disposed && show) return;
        try {
          const response = await request("/api/play/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attemptId: question.attemptId,
              revision: question.revision ?? 0,
              visible: show,
            }),
            keepalive: !show,
          });
          if (!response.ok) return;
          const parsed = drillActivityResultSchema.safeParse(
            await response.json(),
          );
          if (!parsed.success || disposed) return;
          if (parsed.data.refreshed) {
            if (!refreshing) {
              refreshing = true;
              onRefresh?.();
            }
            return;
          }
          base = parsed.data.elapsedMs;
          at = performance.now();
          setElapsedMs(base);
        } catch {
          /* The next heartbeat reconciles with the server. */
        }
      });
    };
    const visibility = () => {
      base = value();
      at = performance.now();
      visible = !document.hidden;
      setElapsedMs(base);
      pulse(visible);
    };
    const close = () => {
      visible = false;
      pulse(false);
    };
    const tick = setInterval(() => setElapsedMs(value()), 1000);
    const heartbeat = setInterval(() => {
      if (visible) pulse(true);
    }, DRILL_HEARTBEAT_MS);
    pulse(visible);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", close);
    return () => {
      disposed = true;
      clearInterval(tick);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", close);
      pulse(false);
    };
  }, [
    question.attemptId,
    question.revision,
    question.elapsedMs,
    request,
    cap,
    result,
    busy,
    onRefresh,
  ]);
  return (
    <span className={styles.timer} aria-label="Time on this drill">
      {formatDrillTime(Math.min(result ? result.timeMs : elapsedMs, cap))}
      <span> No hard stop{resumed ? " · Resumed" : ""}</span>
    </span>
  );
}
