"use client";

import Link from "next/link";
import { beginGoogleSignIn, type GoogleSignInMode } from "@/lib/google-sign-in";
import { useState } from "react";

export function GoogleSignIn({
  failure,
  returnTo,
  guest = false,
  mode = "sign-in",
}: {
  returnTo?: "/admin";
  failure?: "connection" | "generic" | "link_exists" | "link_failed";
  guest?: boolean;
  mode?: GoogleSignInMode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(failure);
  async function signIn() {
    setBusy(true);
    setError(undefined);
    try {
      const url = await beginGoogleSignIn({
        returnTo,
        mode,
      });
      if (url) window.location.assign(url);
    } catch {
      setError(mode === "save-guest" ? "link_failed" : "generic");
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
        {busy
          ? "Opening Google…"
          : mode === "save-guest"
            ? "Create account with Google"
            : "Continue with Google"}
      </button>
      {error && (
        <p
          role={error === "link_exists" ? "status" : "alert"}
          className="text-danger mt-3 text-sm"
        >
          {error === "connection"
            ? "The sign-in service is temporarily unavailable. Please try again."
            : error === "link_exists"
              ? "You already have an account with this Google login. Continue with Google to sign in to it."
              : error === "link_failed"
                ? "Could not save your guest progress with Google. Retry, or sign in to your existing account below."
                : "Sign-in couldn’t be completed. Please try again."}
        </p>
      )}
      {guest && (
        <p className="text-muted mt-4 text-sm">
          <Link
            className="underline"
            href={mode === "save-guest" ? "/sign-in" : "/sign-in?guest=1"}
          >
            {mode === "save-guest"
              ? "Already have an account? Sign in"
              : "New here? Create an account with this guest progress"}
          </Link>
        </p>
      )}
    </>
  );
}
