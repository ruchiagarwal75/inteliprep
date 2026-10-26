import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInterviewStorage,
  InterviewStorageConflict,
} from "@/lib/interview-storage";
const {
  activeInterviewId,
  deleteInterview,
  listInterviews,
  readInterview,
  saveInterview,
  selectInterview,
} = createInterviewStorage("11111111-1111-4111-8111-111111111111");
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { updateSavedInterview } from "@/lib/saved-interview";
import { scorecardFixture } from "@/lib/fixtures/scorecard-test";
import { initialInterviewId } from "@/lib/interview-navigation";

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("IndexedDB interview library", () => {
  it("returns empty history without a selected session on first visit", async () => {
    expect(await listInterviews()).toEqual([]);
    expect(await activeInterviewId()).toBeUndefined();
  });
  it("survives closing and reopening database connections with full transcript and board", async () => {
    const saved = savedFixture();
    await saveInterview(saved);
    expect(await activeInterviewId()).toBe(saved.id);
    expect(await readInterview(saved.id)).toEqual(saved);
    expect(await listInterviews()).toHaveLength(1);
  });
  it("atomically updates a session when its expected revision matches", async () => {
    const original = savedFixture();
    await saveInterview(original);
    const updated = updateSavedInterview(
      original,
      {
        messages: [
          ...original.messages,
          { role: "user", content: "I'm drawing", action: "draw" },
        ],
      },
      original.whiteboard,
    );
    await saveInterview(updated, original.revision);
    expect(await readInterview(original.id)).toEqual(updated);
  });
  it("reopens the exact completed scorecard and transcript after closing the database", async () => {
    const original = savedFixture();
    await saveInterview(original);
    const ended = updateSavedInterview(
      original,
      { hasEnded: true, scorecard: scorecardFixture(), endRequest: undefined },
      original.whiteboard,
    );
    await saveInterview(ended, original.revision);
    expect((await readInterview(original.id))?.scorecard).toEqual(
      ended.scorecard,
    );
    expect((await listInterviews())[0]).toMatchObject({
      hasEnded: true,
      hasScorecard: true,
    });
  });
  it("keeps the original deadline and calibration through drawing autosaves and reloads", async () => {
    const original = savedFixture();
    await saveInterview(original);
    const updated = updateSavedInterview(
      original,
      {},
      { ...original.whiteboard, appState: { viewBackgroundColor: "#eeeeee" } },
    );
    await saveInterview(updated, original.revision);
    const restored = await readInterview(original.id);
    expect(restored?.interview.timing).toEqual(original.interview.timing);
    expect(restored?.clockOffsetMs).toBe(original.clockOffsetMs);
    expect(restored?.whiteboard.appState.viewBackgroundColor).toBe("#eeeeee");
  });
  it("rejects stale saves from another tab and retains the newer session", async () => {
    const original = savedFixture();
    await saveInterview(original);
    const newer = updateSavedInterview(
      original,
      { hasEnded: true },
      original.whiteboard,
    );
    await saveInterview(newer, original.revision);
    const stale = updateSavedInterview(original, {}, original.whiteboard);
    await expect(
      saveInterview(stale, original.revision),
    ).rejects.toBeInstanceOf(InterviewStorageConflict);
    expect(await readInterview(original.id)).toEqual(newer);
  });
  it("orders history newest first and clearing selection preserves all saved interviews", async () => {
    const first = {
      ...savedFixture(),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    };
    const second = {
      ...savedFixture(),
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    await saveInterview(first);
    await saveInterview(second);
    expect((await listInterviews()).map((saved) => saved.id)).toEqual([
      second.id,
      first.id,
    ]);
    await selectInterview(first.id);
    expect(await activeInterviewId()).toBe(first.id);
    expect(initialInterviewId("", await listInterviews())).toBe(second.id);
    expect(
      initialInterviewId(`?session=${first.id}`, await listInterviews()),
    ).toBe(first.id);
    const reopened = {
      ...first,
      updatedAt: "2026-01-04T00:00:00.000Z",
      revision: crypto.randomUUID(),
    };
    await saveInterview(reopened, first.revision);
    expect((await listInterviews()).map((entry) => entry.id)).toEqual([
      second.id,
      first.id,
    ]);
    await selectInterview();
    expect(await activeInterviewId()).toBeUndefined();
    expect(await listInterviews()).toHaveLength(2);
  });
  it("deletes only the selected record and clears its active pointer", async () => {
    const first = savedFixture(),
      second = savedFixture();
    await saveInterview(first);
    await saveInterview(second);
    await deleteInterview(first.id);
    expect(await activeInterviewId()).toBe(second.id);
    await deleteInterview(second.id);
    expect(await activeInterviewId()).toBeUndefined();
    expect(await readInterview(second.id)).toBeUndefined();
  });
  it("reports unavailable browser storage without silently claiming a save succeeded", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(saveInterview(savedFixture())).rejects.toThrow(
      "Browser storage isn't available",
    );
  });
  it("reports corrupt records and retains them instead of erasing browser data", async () => {
    const saved = savedFixture();
    await saveInterview(saved);
    await new Promise<void>((resolve) => {
      const request = indexedDB.open(
        "inteliprep:account:11111111-1111-4111-8111-111111111111",
        1,
      );
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("interviews", "readwrite");
        tx.objectStore("interviews").put({ id: saved.id, version: 99 });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    await expect(readInterview(saved.id)).rejects.toThrow(
      "browser copy has been retained",
    );
    expect(await listInterviews()).toEqual([]);
  });
  it("rejects an aborted write and leaves the previous record and active pointer intact", async () => {
    const original = savedFixture();
    await saveInterview(original);
    const fail = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(() => {
        throw new DOMException("Storage is full", "QuotaExceededError");
      });
    await expect(
      saveInterview(
        updateSavedInterview(original, { hasEnded: true }, original.whiteboard),
        original.revision,
      ),
    ).rejects.toThrow("Storage is full");
    fail.mockRestore();
    expect(await readInterview(original.id)).toEqual(original);
    expect(await activeInterviewId()).toBe(original.id);
  });
});
