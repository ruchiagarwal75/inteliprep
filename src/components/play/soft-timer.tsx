"use client";
import { useEffect, useRef, useState } from "react";
import type { DrillQuestion, DrillResult } from "@/lib/play/public";
import { drillActivityResultSchema } from "@/lib/play/public";
import { DRILL_HEARTBEAT_MS, formatDrillTime } from "@/lib/play/drill-time";
import { useCandidateAccount } from "@/components/candidate-account-context";
import styles from "./drill.module.css";
import { DrillActivityOrder } from "./drill-activity-order";
export function SoftTimer({
  question,
  result,
  resumed,
  busy,
  paused = false,
  onRefresh,
}: {
  question: DrillQuestion;
  result?: DrillResult;
  resumed?: boolean;
  busy: boolean;
  paused?: boolean;
  onRefresh?: () => void;
}) {
  const { request } = useCandidateAccount();
  const [elapsedMs, setElapsedMs] = useState(question.elapsedMs ?? 0);
  const checkpoint = useRef(question.elapsedMs ?? 0);
  const flight = useRef<AbortController | null>(null);
  const [orders] = useState(() => new DrillActivityOrder());
  const cap = question.maxTimeMs ?? Number.MAX_SAFE_INTEGER;
  useEffect(() => {
    if (result || busy) return;
    let base = Math.max(question.elapsedMs ?? 0, checkpoint.current),
      at = performance.now(),
      visible = !document.hidden && !paused,
      disposed = false,
      refreshing = false;
    const value = () =>
      Math.min(cap, base + (visible ? performance.now() - at : 0));
    const pulse = (show: boolean) => {
      if (disposed && show) return;
      flight.current?.abort();
      const abort = new AbortController();
      flight.current = abort;
      const order = orders.next(question.activityOrder ?? 0);
      void (async () => {
        try {
          const response = await request("/api/play/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attemptId: question.attemptId,
              revision: question.revision ?? 0,
              visible: show,
              order,
            }),
            keepalive: !show,
            signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
          });
          if (!response.ok) return;
          const parsed = drillActivityResultSchema.safeParse(
            await response.json(),
          );
          if (!parsed.success || disposed || abort.signal.aborted) return;
          if (parsed.data.refreshed) {
            if (!refreshing) {
              refreshing = true;
              onRefresh?.();
            }
            return;
          }
          base = parsed.data.elapsedMs;
          checkpoint.current = base;
          at = performance.now();
          if (!paused) setElapsedMs(base);
        } catch {
          /* The next heartbeat reconciles with the server. */
        } finally {
          if (flight.current === abort) flight.current = null;
        }
      })();
    };
    const visibility = () => {
      base = value();
      at = performance.now();
      visible = !document.hidden && !paused;
      if (!paused) setElapsedMs(base);
      pulse(visible);
    };
    const close = () => {
      base = value();
      at = performance.now();
      visible = false;
      pulse(false);
    };
    const tick = paused
      ? undefined
      : setInterval(() => setElapsedMs(value()), 1000);
    const heartbeat = setInterval(() => {
      if (visible) pulse(true);
    }, DRILL_HEARTBEAT_MS);
    pulse(visible);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", close);
    return () => {
      checkpoint.current = value();
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
    question.activityOrder,
    orders,
    request,
    cap,
    result,
    busy,
    paused,
    onRefresh,
  ]);
  return (
    <span className={styles.timer} aria-label="Time on this drill">
      {formatDrillTime(Math.min(result ? result.timeMs : elapsedMs, cap))}
      <span>
        {paused ? " Paused for slides" : " No hard stop"}
        {resumed ? " · Resumed" : ""}
      </span>
    </span>
  );
}
