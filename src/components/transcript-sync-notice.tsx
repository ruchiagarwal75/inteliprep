"use client";
import { useState } from "react";
export function TranscriptSyncNotice({
  onLoad,
  disabled,
}: {
  onLoad: () => Promise<boolean>;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div
      role="alert"
      className="shrink-0 border-b border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <p>
        This interview changed in another tab. Load the latest conversation to
        continue. Your drawing and unsent text will be kept.
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
}: {
  messages?: string[];
}) {
  const [copied, setCopied] = useState<number>();
  const [copyError, setCopyError] = useState<string>();
  if (!messages?.length) return null;
  return (
    <details open className="shrink-0 border-b px-3 py-2 text-xs">
      <summary className="cursor-pointer">
        Unsent messages kept from this tab ({messages.length})
      </summary>
      <p className="my-2">
        These messages were not sent. Use Copy, then paste a message into the
        message box when ready. Your current draft is unchanged.
      </p>
      <div className="max-h-40 overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className="mb-3">
            <pre className="whitespace-pre-wrap">{message}</pre>
            <button
              type="button"
              aria-label={`Copy unsent message ${index + 1}`}
              className="mt-1 rounded-md border border-current px-2 py-1"
              onClick={async () => {
                setCopyError(undefined);
                try {
                  await navigator.clipboard.writeText(message);
                  setCopied(index);
                } catch {
                  setCopyError(
                    "Couldn't copy automatically. Select the message text and copy it.",
                  );
                }
              }}
            >
              {copied === index ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>
      <p role="status" className="mt-1">
        {copyError ??
          (copied !== undefined
            ? `Message ${copied + 1} copied. Your draft is unchanged.`
            : "")}
      </p>
    </details>
  );
}
