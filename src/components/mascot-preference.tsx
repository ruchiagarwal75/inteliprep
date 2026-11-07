"use client";

import { useSyncExternalStore } from "react";

export const MASCOT_PREFERENCE_KEY = "mockmeai:show-mascot";
const changeEvent = "mockmeai:mascot-preference";
let fallback = true;
function snapshot() {
  try {
    const stored = localStorage.getItem(MASCOT_PREFERENCE_KEY);
    return stored === null ? fallback : stored !== "false";
  } catch {
    return fallback;
  }
}
function subscribe(update: () => void) {
  const changed = (event: StorageEvent) => {
    if (!event.key || event.key === MASCOT_PREFERENCE_KEY) update();
  };
  window.addEventListener("storage", changed);
  window.addEventListener(changeEvent, update);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener(changeEvent, update);
  };
}
export function useMascotPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
export function setMascotPreference(enabled: boolean) {
  fallback = enabled;
  try {
    localStorage.setItem(MASCOT_PREFERENCE_KEY, String(enabled));
  } catch {
    /* Keep the control usable when browser storage is disabled. */
  }
  window.dispatchEvent(new Event(changeEvent));
}
export function MascotToggle() {
  const enabled = useMascotPreference();
  return (
    <label className="mascot-toggle">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => setMascotPreference(event.target.checked)}
      />
      Show mascot
    </label>
  );
}
