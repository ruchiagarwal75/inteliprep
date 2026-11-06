export function startLimitMessage(retryAt: number, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1_000));
  if (seconds >= 3_600)
    return `You've reached today's practice limit. Try again at ${new Date(retryAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `You've reached the practice limit. Try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
  }
  return `Too many starts. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
}
