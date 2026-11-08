"use client";
import { useState } from "react";
export function InviteSignOut() {
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        className="practice-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
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
