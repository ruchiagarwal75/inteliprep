import { BRAND } from "@/lib/brand";
import { historyGenerationKey } from "@/lib/practice-history-generation";
/** Explicit user request only. Never touches another account or the old unassigned database. */
export async function clearPracticeHistory(userId: string) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(
      userId,
    )
  )
    throw new Error("A valid account is required.");
  // Fail before deleting if old tabs cannot be invalidated safely.
  localStorage.setItem(
    historyGenerationKey(userId),
    `removing:${crypto.randomUUID()}`,
  );
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(`inteliprep:account:${userId}`);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new Error("Browser history could not be removed. Please try again."),
      );
    request.onblocked = () =>
      reject(
        new Error(
          `Close other ${BRAND.name} tabs, then retry sign out to remove this account's history.`,
        ),
      );
  });
  localStorage.setItem(historyGenerationKey(userId), crypto.randomUUID());
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith(`inteliprep:draft:${userId}:`) ||
        key.startsWith(`mockmeai:feedback:${userId}:`))
    )
      localStorage.removeItem(key);
  }
}
