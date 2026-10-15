import "server-only";
import { redisConnection } from "@/lib/redis-config";

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
  const redis = redisConnection();
  try {
    const url = new URL(redis.url ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.search)
      throw new Error("Invalid Redis endpoint");
  } catch {
    missing.push(redis.urlKey);
  }
  if (!redis.token) missing.push(redis.tokenKey);
  return missing;
}

export function assertBetaReady(): void {
  if (isPrivateBeta() && missingBetaSettings().length)
    throw new BetaUnavailableError();
}

export function redisNamespace(): string {
  return `inteliprep:v1:${process.env.VERCEL_ENV ?? process.env.INTELIPREP_ENV ?? "local"}`;
}
