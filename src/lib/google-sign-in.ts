"use client";
import { z } from "zod";
import { oauthCallbackUrl } from "./oauth-callback";
import { supabaseBrowser } from "./supabase-browser";
export async function beginGoogleSignIn(input: {
  origin: string;
  guest: boolean;
  returnTo?: "/admin";
}) {
  if (input.guest) {
    const response = await fetch("/api/play/guest/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error("Google account linking failed");
    return z
      .object({
        url: z.url().refine((value) => new URL(value).protocol === "https:"),
      })
      .parse(await response.json()).url;
  }
  const { error } = await supabaseBrowser().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: oauthCallbackUrl(input.origin, input.returnTo),
      scopes: "openid email profile",
    },
  });
  if (error) throw error;
}
