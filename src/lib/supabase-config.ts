/** Public browser configuration only. Never accept a Supabase secret/service-role key. */
export function supabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key?.startsWith("sb_publishable_")) return undefined;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      return undefined;
    return { url: parsed.origin, key };
  } catch {
    return undefined;
  }
}

export class CandidateAuthError extends Error {
  constructor(public readonly status: 401 | 503 = 401) {
    super(
      status === 401
        ? "Please sign in to continue your interview."
        : "Sign-in is temporarily unavailable. Please try again later.",
    );
  }
}

export function requireSupabaseConfiguration() {
  const config = supabaseConfiguration();
  if (!config) throw new CandidateAuthError(503);
  return config;
}

/** Host-only SDK cookies; HTTPS is mandatory on deployed builds. */
export function authCookieOptions() {
  return {
    name: "inteliprep-auth",
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
