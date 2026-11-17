"use client";

import { beginGoogleSignIn } from "@/lib/google-sign-in";
import { useState } from "react";
import { BRAND } from "@/lib/brand";

export function GoogleSignIn({
  failure,
  returnTo,
  guest = false,
}: {
  returnTo?: "/admin";
  failure?: "connection" | "generic" | "link_exists" | "link_failed";
  guest?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(failure);
  async function signIn() {
    setBusy(true);
    setError(undefined);
    try {
      const url = await beginGoogleSignIn({
        origin: window.location.origin,
        returnTo,
        guest,
      });
      if (url) window.location.assign(url);
    } catch {
      setError(guest ? "link_failed" : "generic");
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void signIn()}
        className="bg-brand text-brand-foreground disabled:bg-accent-soft disabled:text-foreground rounded-lg px-5 py-3 font-medium disabled:opacity-100"
      >
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error === "connection"
            ? "The sign-in service is temporarily unavailable. Please try again."
            : error === "link_exists"
              ? `That Google account already has a ${BRAND.name} account and cannot be linked here. You are still a guest, and your progress is kept.`
              : error === "link_failed"
                ? `Google linking could not finish. Your guest progress is kept. Try a Google account that has not used ${BRAND.name} before.`
                : "Sign-in couldn’t be completed. Please try again."}
        </p>
      )}
    </>
  );
}
