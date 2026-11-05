"use client";

export function ChatReplyStatus({
  error,
  pending,
  onRetry,
  disabled,
}: {
  error: string;
  pending: boolean;
  onRetry?: () => void;
  disabled: boolean;
}) {
  return (
    <div
      role="alert"
      className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <p>{error}</p>
      {pending && (
        <p className="mt-1 text-xs">
          Your message is kept here and is awaiting a completed reply.
        </p>
      )}
      {pending && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className="mt-2 rounded-md border border-current px-3 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          Retry reply
        </button>
      )}
    </div>
  );
}
