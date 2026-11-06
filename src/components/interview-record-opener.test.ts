import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { openInterviewRecord } from "@/components/interview-record-opener";
import {
  createInterviewStorage,
  InterviewStorageConflict,
} from "@/lib/interview-storage";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import {
  updateSavedInterview,
  type SavedInterview,
} from "@/lib/saved-interview";
beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());
it("loads canonical chat after a real browser revision conflict while preserving this tab's memory", async () => {
  const storage = createInterviewStorage(crypto.randomUUID());
  const original = savedFixture();
  await storage.saveInterview(original);
  const fromOtherTab = updateSavedInterview(
    original,
    {
      messages: [
        ...original.messages,
        { role: "user", content: "An answer from tab A." },
        { role: "assistant", content: "A real follow-up?" },
      ],
    },
    original.whiteboard,
  );
  await storage.saveInterview(fromOtherTab, original.revision);
  const local = updateSavedInterview(
    original,
    {
      messages: [
        ...original.messages,
        { role: "user", content: "An unsent answer from tab B." },
      ],
      draftText: "A separate unsaved draft.",
      transcriptConflict: true,
    },
    original.whiteboard,
  );
  await expect(
    storage.saveInterview(local, original.revision),
  ).rejects.toBeInstanceOf(InterviewStorageConflict);
  const board = {
    ...local.whiteboard,
    appState: { ...local.whiteboard.appState, scrollX: 123 },
  };
  const a = {
    savedRef: { current: local as SavedInterview | undefined },
    revisionsRef: { current: new Map([[original.id, original.revision]]) },
    dirtyRef: { current: true },
    conflictedRef: { current: true },
    openingRef: { current: false },
    queueRef: { current: Promise.resolve() },
    save: async () => {
      const current = a.savedRef.current;
      if (!current) throw new Error("Missing current record");
      const next = updateSavedInterview(current, {}, board);
      await storage.saveInterview(next, a.revisionsRef.current.get(next.id));
      a.savedRef.current = next;
      a.revisionsRef.current.set(next.id, next.revision);
    },
  };
  const opened = vi.fn(),
    blocked = vi.fn();
  const ok = await openInterviewRecord(
    {
      autosave: a,
      storage,
      request: vi.fn().mockResolvedValue(
        Response.json({
          phase: fromOtherTab.phase,
          resumeToken: "latest",
          ended: false,
          messages: fromOtherTab.messages,
        }),
      ),
      getScene: () => board,
      restoreScene: vi.fn(),
      onOpened: opened,
      onBlocked: blocked,
      onError: vi.fn(),
      onOpening: vi.fn(),
      onUrl: vi.fn(),
    },
    original.id,
    "none",
  );
  expect(ok).toBe(true);
  const restored = await storage.readInterview(original.id);
  expect(restored?.messages).toEqual(fromOtherTab.messages);
  expect(restored?.draftText).toBe(local.draftText);
  expect(restored?.recoveredMessages).toEqual(["An unsent answer from tab B."]);
  expect(restored?.whiteboard.appState.scrollX).toBe(123);
  expect(restored?.revision).not.toBe(fromOtherTab.revision);
  expect(opened.mock.calls[0][0].revision).toBe(restored?.revision);
  expect(a.conflictedRef.current).toBe(false);
  expect(a.openingRef.current).toBe(false);
  expect(blocked).toHaveBeenCalledWith(false);
  storage.deactivate();
});
