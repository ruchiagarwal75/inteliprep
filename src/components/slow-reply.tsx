"use client";
import { useEffect, useState } from "react";
export function SlowReply({ onRetry }: { onRetry: () => void }) {
  const [started] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [started]);
  if (seconds < 15) return null;
  return (
    <div role="status" className="shrink-0 border-t p-3 text-sm">
      {seconds < 45 ? (
        "Still thinking…"
      ) : (
        <>
          Taking too long. Your message is saved.
          <button className="ml-2 rounded border px-3 py-1" onClick={onRetry}>
            Retry reply
          </button>
        </>
      )}
    </div>
  );
}
