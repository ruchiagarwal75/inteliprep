"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function GoogleSignIn({
  failure,
  returnTo,
}: {
  returnTo?: "/admin";
  failure?: "connection" | "generic";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(failure);
  async function signIn() {
    setBusy(true);
    setError(undefined);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (returnTo) callback.searchParams.set("next", returnTo);
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.href,
          scopes: "openid email profile",
        },
      });
      if (error) throw error;
    } catch {
      setError("generic");
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
            : "Sign-in couldn’t be completed. Please try again."}
        </p>
      )}
    </>
  );
}
