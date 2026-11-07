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
        className="bg-brand text-brand-foreground rounded-lg px-5 py-3 font-medium disabled:opacity-60"
      >
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error === "connection"
            ? "The sign-in service is temporarily unavailable. Please try again."
            : "Sign-in couldn’t be completed. Please try again."}
        </p>
      )}
    </>
  );
}
