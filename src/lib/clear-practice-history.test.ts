import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it, vi } from "vitest";
import { createInterviewStorage } from "@/lib/interview-storage";
import { clearPracticeHistory } from "@/lib/clear-practice-history";
import { browserDraftJournal } from "@/lib/draft-journal";
import { InterviewStorageInactiveError } from "@/lib/interview-database";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
afterEach(() => vi.unstubAllGlobals());
it("clears only the chosen account and prevents old-tab saves or drafts from resurrecting it", async () => {
  const values = new Map<string, string>();
  const store = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("localStorage", store);
  vi.stubGlobal("sessionStorage", store);
  vi.stubGlobal("window", {});
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  const first = createInterviewStorage(a),
    other = createInterviewStorage(b),
    saved = savedFixture();
  await first.saveInterview(saved);
  await other.saveInterview(saved);
  const draft = browserDraftJournal(a, saved.id)!;
  draft.write("private draft");
  store.setItem(`inteliprep:draft:${b}:keep`, "another account");
  await clearPracticeHistory(a);
  await expect(first.saveInterview(saved)).rejects.toBeInstanceOf(
    InterviewStorageInactiveError,
  );
  draft.write("late callback");
  expect(
    [...values.keys()].some((key) => key.startsWith(`inteliprep:draft:${a}:`)),
  ).toBe(false);
  expect(await createInterviewStorage(a).listInterviews()).toEqual([]);
  expect(await other.readInterview(saved.id)).toEqual(saved);
  expect(store.getItem(`inteliprep:draft:${b}:keep`)).toBe("another account");
});
