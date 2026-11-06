export function retryAfterSeconds(
  value: string | null,
  now = Date.now(),
): number | undefined {
  if (!value?.trim()) return;
  const seconds = /^\d+(?:\.\d+)?$/u.test(value.trim())
    ? Number(value)
    : (Date.parse(value) - now) / 1_000;
  if (!Number.isFinite(seconds) || seconds < 0) return;
  return Math.min(86_400, Math.ceil(seconds));
}
export function rateLimitMessage(seconds: number) {
  return seconds > 0
    ? `Too many requests. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`
    : "You can retry now.";
}
export class InterviewRateLimitError extends Error {
  constructor(
    public readonly retryAt: number,
    seconds: number,
  ) {
    super(rateLimitMessage(seconds));
  }
}
export function responseRateLimit(response: Response, now = Date.now()) {
  if (response.status !== 429) return;
  const seconds = retryAfterSeconds(response.headers.get("Retry-After"), now);
  return seconds === undefined
    ? undefined
    : new InterviewRateLimitError(now + seconds * 1_000, seconds);
}
