/** A local deletion invalidates old tabs and draft callbacks for this account only. */
export function historyGenerationKey(userId: string) {
  return `mockmeai:history-generation:${userId}`;
}
export function historyGeneration(userId: string) {
  try {
    return typeof localStorage === "undefined"
      ? "legacy"
      : (localStorage.getItem(historyGenerationKey(userId)) ?? "legacy");
  } catch {
    return "legacy";
  }
}
