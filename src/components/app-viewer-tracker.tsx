"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  appViewerId,
  existingAppViewerId,
  isViewerEntry,
} from "@/lib/app-viewer";
import { createAppViewerReporter } from "@/lib/app-viewer-reporter";
import { isAutomatedViewer } from "@/lib/viewer-automation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function AppViewerTracker() {
  const entry = isViewerEntry(usePathname());
  const reporter = useRef<ReturnType<typeof createAppViewerReporter> | null>(
    null,
  );
  useEffect(() => {
    if (isAutomatedViewer(navigator.userAgent, navigator.webdriver)) return;
    try {
      // QA can opt out without changing account permissions or interview storage.
      if (localStorage.getItem("mockmeai:exclude-analytics") === "1") return;
    } catch {
      return;
    }
    reporter.current ??= createAppViewerReporter(
      async (create) => {
        const identify = () =>
          create
            ? appViewerId(localStorage)
            : existingAppViewerId(localStorage);
        return navigator.locks
          ? navigator.locks.request("mockmeai-app-viewer", identify)
          : identify();
      },
      async (id) =>
        (
          await fetch("/api/monitoring/viewer", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId: id }),
            keepalive: true,
            signal: AbortSignal.timeout(5000),
          })
        ).ok,
    );
    const report = (accountId?: string) => {
      void reporter.current?.(entry, accountId).catch(() => {});
    };
    report();
    try {
      const { data } = supabaseBrowser().auth.onAuthStateChange(
        (event, session) => {
          if (event === "INITIAL_SESSION" || event === "SIGNED_IN")
            queueMicrotask(() => report(session?.user.id));
        },
      );
      return () => data.subscription.unsubscribe();
    } catch {
      /* Tracking must not interrupt the page when Auth is unavailable. */
    }
  }, [entry]);
  return null;
}
