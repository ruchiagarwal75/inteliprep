"use client";
import { useState, useSyncExternalStore } from "react";
const key = "inteliprep:laptop-note-dismissed";
const subscribe = () => () => {};
export function LaptopNote() {
  const [dismissed, setDismissed] = useState(false);
  const seen = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  if (seen || dismissed) return null;
  return (
    <p className="flex shrink-0 items-center justify-between rounded border px-2 py-1 text-xs min-[600px]:hidden">
      Best on a laptop
      <button
        className="rounded px-2 py-1 underline"
        onClick={() => {
          try {
            localStorage.setItem(key, "1");
          } catch {}
          setDismissed(true);
        }}
      >
        Dismiss
      </button>
    </p>
  );
}
