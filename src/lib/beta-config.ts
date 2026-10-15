import "server-only";

export class BetaUnavailableError extends Error {
  constructor() {
    super(
      "The interview service is temporarily unavailable. Please try again later.",
    );
  }
}

export function isPrivateBeta(): boolean {
  return process.env.VERCEL === "1" || process.env.INTELIPREP_ENV === "beta";
}

/** Read lazily: builds do not need deployment secrets. Never return secret values. */
export function missingBetaSettings(): string[] {
  const missing: string[] = [];
  if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production")
    missing.push("PRIVATE_BETA_REQUIRES_PREVIEW");
  if (!process.env.OPENAI_KEY) missing.push("OPENAI_KEY");
  if ((process.env.INTERVIEW_RESUME_SECRET?.length ?? 0) < 32)
    missing.push("INTERVIEW_RESUME_SECRET");
  try {
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.search)
      throw new Error("Invalid Redis endpoint");
  } catch {
    missing.push("UPSTASH_REDIS_REST_URL");
  }
  if (!process.env.UPSTASH_REDIS_REST_TOKEN)
    missing.push("UPSTASH_REDIS_REST_TOKEN");
  return missing;
}

export function assertBetaReady(): void {
  if (isPrivateBeta() && missingBetaSettings().length)
    throw new BetaUnavailableError();
}

export function redisNamespace(): string {
  return `inteliprep:v1:${process.env.VERCEL_ENV ?? process.env.INTELIPREP_ENV ?? "local"}`;
}
