import { historyGeneration } from "@/lib/practice-history-generation";
import { boundedChatDraft } from "@/lib/chat-draft";
type Store = Pick<Storage, "getItem" | "setItem">;
/** A synchronous, tab-local journal protects the debounce/unload window. IndexedDB remains the history store. */
export function draftJournal(store: Store, key: string) {
  return {
    read(fallback: string, savedAt = 0) {
      try {
        const value: unknown = JSON.parse(store.getItem(key) ?? "null");
        if (
          value &&
          typeof value === "object" &&
          "text" in value &&
          typeof value.text === "string" &&
          "at" in value &&
          typeof value.at === "number" &&
          value.at >= savedAt
        )
          return boundedChatDraft(value.text);
      } catch {}
      return boundedChatDraft(fallback);
    },
    write(text: string) {
      try {
        store.setItem(
          key,
          JSON.stringify({ text: boundedChatDraft(text), at: Date.now() }),
        );
      } catch {}
    },
  };
}
export function browserDraftJournal(userId: string, sessionId?: string) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    let tab = sessionStorage.getItem("inteliprep:draft-tab");
    if (!tab) {
      tab = crypto.randomUUID();
      sessionStorage.setItem("inteliprep:draft-tab", tab);
    }
    const generation = historyGeneration(userId);
    const journal = draftJournal(
      localStorage,
      `inteliprep:draft:${userId}:${sessionId}:${tab}`,
    );
    return {
      read: (fallback: string, savedAt?: number) =>
        !generation.startsWith("removing:") &&
        generation === historyGeneration(userId)
          ? journal.read(fallback, savedAt)
          : "",
      write: (text: string) => {
        if (
          !generation.startsWith("removing:") &&
          generation === historyGeneration(userId)
        )
          journal.write(text);
      },
    };
  } catch {
    return;
  }
}
