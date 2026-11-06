"use client";
import { useEffect, useState } from "react";
import { rateLimitMessage } from "@/lib/retry-after";

export function ChatReplyStatus({
  error,
  pending,
  onRetry,
  disabled,
  retryAt,
}: {
  error: string;
  pending: boolean;
  onRetry?: () => void;
  disabled: boolean;
  retryAt?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= retryAt) clearInterval(timer);
    }, 1_000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const remaining = retryAt
    ? Math.max(0, Math.ceil((retryAt - now) / 1_000))
    : 0;
  return (
    <div
      role="alert"
      className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <p>{retryAt ? rateLimitMessage(remaining) : error}</p>
      {pending && (
        <p className="mt-1 text-xs">
          Your message is kept here and is awaiting a completed reply.
        </p>
      )}
      {pending && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled || remaining > 0}
          className="mt-2 rounded-md border border-current px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Retry reply
        </button>
      )}
    </div>
  );
}
