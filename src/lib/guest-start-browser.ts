"use client";
import { supabaseBrowser } from "./supabase-browser";
let starting: Promise<void> | undefined;
/** One browser operation across React remounts. No custom progress storage or merge. */
export function startGuest(captchaToken?: string) {
  if (starting) return starting;
  starting = (async () => {
    const client = supabaseBrowser();
    const { data: existing } = await client.auth.getSession();
    if (existing.session) return;
    const permit = await fetch("/api/play/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(12000),
    });
    if (!permit.ok)
      throw Error(
        permit.status === 429
          ? "Please wait before starting another guest session."
          : "Guest practice is unavailable. Please try again.",
      );
    const { data, error } = await client.auth.signInAnonymously({
      options: { captchaToken },
    });
    if (error || !data.session || !data.user?.is_anonymous)
      throw Error("Guest practice could not start. Please try again.");
  })().finally(() => {
    starting = undefined;
  });
  return starting;
}
