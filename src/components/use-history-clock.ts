"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(tick: () => void) {
  const interval = setInterval(tick, 250);
  window.addEventListener("focus", tick);
  document.addEventListener("visibilitychange", tick);
  return () => {
    clearInterval(interval);
    window.removeEventListener("focus", tick);
    document.removeEventListener("visibilitychange", tick);
  };
}
const readClock = () => Math.floor(Date.now() / 1000) * 1000;
const serverClock = () => 0;

/** Refresh unopened history rows without fetching or changing saved interviews. */
export function useHistoryClock(visible: boolean) {
  const subscribeClock = useCallback(
    (tick: () => void) => (visible ? subscribe(tick) : () => {}),
    [visible],
  );
  return useSyncExternalStore(subscribeClock, readClock, serverClock);
}
