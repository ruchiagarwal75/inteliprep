"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { appViewerId, isViewerEntry } from "@/lib/app-viewer";

export function AppViewerTracker() {
  const entry = isViewerEntry(usePathname());
  const sent = useRef(false);
  useEffect(() => {
    if (!entry || sent.current) return;
    sent.current = true;
    const identify = () => {
      try {
        return appViewerId(window.localStorage);
      } catch {
        return undefined;
      }
    };
    void (async () => {
      // A browser-wide lock also deduplicates simultaneous first visits in two tabs.
      const id = await (navigator.locks
        ? navigator.locks.request("mockmeai-app-viewer", identify)
        : identify());
      if (!id) return;
      await fetch("/api/monitoring/viewer", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: id }),
        keepalive: true,
        signal: AbortSignal.timeout(5000),
      });
    })().catch(() => {});
  }, [entry]);
  return null;
}
