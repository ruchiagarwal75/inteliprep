import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createInterviewStorage,
  InterviewStorageConflict,
} from "@/lib/interview-storage";
import { createInterviewStart, getProblem } from "@/lib/problems";
import { newSavedInterview, updateSavedInterview } from "@/lib/saved-interview";
import { whiteboardFixture } from "@/lib/fixtures/whiteboard-test";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
const user = "11111111-1111-4111-8111-111111111111";
const otherUser = "22222222-2222-4222-8222-222222222222";
beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function attempt(
  day: number,
  problemId = "single-server-scaling",
  level: "mid" | "staff" = "mid",
  duration: 1 | 45 = 45,
) {
  const problem = getProblem(problemId);
  if (!problem) throw Error("Missing problem");
  const saved = newSavedInterview(
    createInterviewStart(problem, level, duration),
    whiteboardFixture(),
  );
  saved.createdAt = saved.updatedAt = new Date(
    Date.UTC(2026, 0, day),
  ).toISOString();
  return saved;
}
async function rawRecords(
  seed?: unknown[],
  activeId?: string,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`inteliprep:account:${user}`, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("interviews", { keyPath: "id" });
      request.result.createObjectStore("meta");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction(
          ["interviews", "meta"],
          seed ? "readwrite" : "readonly",
        );
      if (seed) {
        for (const row of seed) tx.objectStore("interviews").put(row);
        if (activeId) tx.objectStore("meta").put(activeId, "active");
      }
      const all = tx.objectStore("interviews").getAll();
      tx.oncomplete = () => {
        db.close();
        resolve(all.result);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
it("shows the latest attempt while preserving the entire earlier saved record", async () => {
  const store = createInterviewStorage(user);
  const old = { ...attempt(1), hasEnded: true, scorecard: scorecardFixture() };
  const next = {
    ...attempt(2, old.interview.problemId, "staff", 1),
    draftText: "Latest draft",
    messages: [
      ...old.messages,
      { role: "user" as const, content: "Latest answer" },
    ],
  };
  await store.saveInterview(old);
  await store.saveInterview(next);
  expect(await store.readInterview(old.id)).toEqual(old);
  expect(await store.readInterview(next.id)).toEqual(next);
  expect(await store.activeInterviewId()).toBe(next.id);
  expect(await rawRecords()).toEqual(expect.arrayContaining([old, next]));
  expect(await createInterviewStorage(user).listInterviews()).toHaveLength(1);
});
it("filters version-1 duplicates without deleting valid or unreadable saved records", async () => {
  const old = attempt(1),
    latest = attempt(3),
    other = attempt(2, "url-shortener");
  const corrupt = { id: crypto.randomUUID(), version: 99 };
  await rawRecords([old, latest, other, corrupt], old.id);
  const store = createInterviewStorage(user);
  expect((await store.listInterviews()).map((row) => row.id)).toEqual([
    latest.id,
    other.id,
  ]);
  expect(await store.activeInterviewId()).toBe(latest.id);
  expect(await rawRecords()).toEqual(
    expect.arrayContaining([old, latest, other, corrupt]),
  );
  expect(await rawRecords()).toHaveLength(4);
  await expect(store.readInterview(corrupt.id)).rejects.toThrow("retained");
});
it("does not let stale autosaves or late scorecards revive the old copy", async () => {
  const tabA = createInterviewStorage(user),
    tabB = createInterviewStorage(user);
  const old = attempt(1),
    latest = attempt(2);
  await tabA.saveInterview(old);
  await tabB.saveInterview(latest);
  const late = updateSavedInterview(
    old,
    { hasEnded: true, scorecard: scorecardFixture() },
    old.whiteboard,
  );
  late.updatedAt = "2030-01-01T00:00:00.000Z";
  await expect(tabA.saveInterview(late, old.revision)).rejects.toBeInstanceOf(
    InterviewStorageConflict,
  );
  await expect(tabA.saveInterview(late)).rejects.toBeInstanceOf(
    InterviewStorageConflict,
  );
  expect(await tabB.readInterview(latest.id)).toEqual(latest);
  expect(await tabB.listInterviews()).toHaveLength(1);
});
it("serializes concurrent tab saves and retains the newest created attempt", async () => {
  const older = attempt(1),
    newer = attempt(2);
  const results = await Promise.allSettled([
    createInterviewStorage(user).saveInterview(newer),
    createInterviewStorage(user).saveInterview(older),
  ]);
  expect(results[0].status).toBe("fulfilled");
  expect(results[1].status).toBe("rejected");
  expect(await rawRecords()).toEqual([newer]);
});
it("rolls back the new attempt and pruning together if a replacement cannot be written", async () => {
  const store = createInterviewStorage(user),
    old = attempt(1),
    next = attempt(2);
  await store.saveInterview(old);
  const original = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
    this: IDBObjectStore,
    value: unknown,
    key?: IDBValidKey,
  ) {
    if (
      value &&
      typeof value === "object" &&
      "id" in value &&
      value.id === next.id
    )
      throw new DOMException("Storage is full", "QuotaExceededError");
    return key === undefined
      ? original.call(this, value)
      : original.call(this, value, key);
  });
  await expect(store.saveInterview(next)).rejects.toThrow("Storage is full");
  vi.restoreAllMocks();
  expect(await store.readInterview(old.id)).toEqual(old);
  expect(await store.activeInterviewId()).toBe(old.id);
  expect(await rawRecords()).toEqual([old]);
});
it("does not resurrect a deleted attempt or its predecessor, but permits a newer retake", async () => {
  const store = createInterviewStorage(user),
    old = attempt(1),
    latest = attempt(2),
    next = attempt(3);
  await store.saveInterview(old);
  await store.saveInterview(latest);
  await store.deleteInterview(latest.id);
  await expect(store.saveInterview(old)).rejects.toBeInstanceOf(
    InterviewStorageConflict,
  );
  await expect(store.saveInterview(latest)).rejects.toBeInstanceOf(
    InterviewStorageConflict,
  );
  expect(await store.listInterviews()).toEqual([]);
  expect(await store.activeInterviewId()).toBeUndefined();
  await store.saveInterview(next);
  expect(await rawRecords()).toEqual(expect.arrayContaining([old, next]));
});
it("keeps different problems and different accounts independent", async () => {
  const alice = createInterviewStorage(user),
    bob = createInterviewStorage(otherUser);
  const old = attempt(1),
    next = attempt(2),
    other = attempt(1, "url-shortener");
  await alice.saveInterview(old);
  await alice.saveInterview(other);
  await bob.saveInterview(old);
  await alice.saveInterview(next);
  expect((await alice.listInterviews()).map((row) => row.id)).toEqual([
    next.id,
    other.id,
  ]);
  expect(await bob.readInterview(old.id)).toEqual(old);
  expect(await bob.listInterviews()).toHaveLength(1);
});
