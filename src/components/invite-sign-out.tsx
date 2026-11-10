"use client";
import { clearPracticeHistory } from "@/lib/clear-practice-history";
import { useState } from "react";
export function InviteSignOut({ userId }: { userId?: string }) {
  const [removeHistory, setRemoveHistory] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {userId && (
        <label className="history-removal-choice">
          <input
            type="checkbox"
            checked={removeHistory}
            disabled={busy}
            onChange={(event) => setRemoveHistory(event.target.checked)}
          />
          Also remove my practice history from this browser
        </label>
      )}
      <button
        type="button"
        className="practice-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            if (removeHistory && userId) await clearPracticeHistory(userId);
            const response = await fetch("/auth/sign-out", {
              method: "POST",
              signal: AbortSignal.timeout(12000),
            });
            if (!response.ok) throw new Error("Sign out unavailable");
            window.location.replace("/sign-in");
          } catch {
            setFailed(true);
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out..." : "Sign out and use another account"}
      </button>
      {failed && (
        <p role="alert">
          Sign-out couldn&apos;t be completed. Please try again.
        </p>
      )}
    </>
  );
}
