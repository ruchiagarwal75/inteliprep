"use client";
import { useState } from "react";
export function TranscriptSyncNotice({
  onLoad,
  disabled,
  storageConflict = false,
}: {
  onLoad: () => Promise<boolean>;
  disabled: boolean;
  storageConflict?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div
      role="alert"
      className="shrink-0 border-b border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <p>
        {storageConflict
          ? "This saved interview changed in another tab. Load the latest version to continue. If a newer attempt replaced this one, that attempt will open."
          : "This interview changed in another tab. Load the latest conversation to continue. Your drawing and unsent text will be kept."}
      </p>
      <button
        type="button"
        disabled={disabled || loading}
        className="mt-2 rounded-md border border-current px-3 py-1.5 font-medium disabled:opacity-40"
        onClick={async () => {
          setLoading(true);
          setError(undefined);
          try {
            if (!(await onLoad()))
              setError("Couldn't load the latest version. Please try again.");
          } catch {
            setError("Couldn't load the latest version. Please try again.");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Loading latest…" : "Load latest version"}
      </button>
      {error && <p className="mt-1">{error}</p>}
    </div>
  );
}
export function RecoveredInterviewMessages({
  messages,
  onResend,
  onDismiss,
  disabled = false,
}: {
  messages?: string[];
  onResend: (message: string) => void;
  onDismiss: (message: string) => void;
  disabled?: boolean;
}) {
  if (!messages?.length) return null;
  return (
    <details open className="shrink-0 border-b px-3 py-2 text-xs">
      <summary className="cursor-pointer">
        Unsent messages kept from this tab ({messages.length})
      </summary>
      <p className="my-2">
        These messages were not sent. Resend sends a message automatically. Your
        current draft is unchanged.
      </p>
      <div className="max-h-40 overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className="mb-3">
            <pre className="whitespace-pre-wrap">{message}</pre>
            <button
              type="button"
              aria-label={`Resend unsent message ${index + 1}`}
              disabled={disabled}
              className="mt-1 rounded-md border border-current px-2 py-1"
              onClick={() => onResend(message)}
            >
              Resend
            </button>
            <button
              type="button"
              className="ml-2 rounded border px-2 py-1"
              onClick={() => onDismiss(message)}
              aria-label={`Dismiss unsent message ${index + 1}`}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
