"use client";
import { z } from "zod";
export type GoogleSignInMode = "sign-in" | "save-guest";
export async function beginGoogleSignIn(input: {
  mode: GoogleSignInMode;
  returnTo?: "/admin";
}) {
  const response = await fetch(
    input.mode === "save-guest" ? "/api/play/guest/link" : "/auth/google",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        input.mode === "sign-in" && input.returnTo
          ? { next: input.returnTo }
          : {},
      ),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw Error("Google sign-in failed");
  return z
    .object({
      url: z.url().refine((value) => new URL(value).protocol === "https:"),
    })
    .parse(await response.json()).url;
}
