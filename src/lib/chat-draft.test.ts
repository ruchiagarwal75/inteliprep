import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInterviewStorage } from "@/lib/interview-storage";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { updateSavedInterview } from "@/lib/saved-interview";
import { boundedChatDraft } from "@/lib/chat-draft";
beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());
it("bounds drafts before updating state and keeps browser saves working", async () => {
  const saved = savedFixture();
  const draft = "A design answer. ".repeat(1_000);
  const update = updateSavedInterview(
    saved,
    { draftText: draft },
    saved.whiteboard,
  );
  expect(update.draftText).toHaveLength(8_000);
  expect(boundedChatDraft(draft)).toBe(update.draftText);
  const storage = createInterviewStorage(crypto.randomUUID());
  await storage.saveInterview(update);
  expect((await storage.readInterview(saved.id))?.draftText).toBe(
    update.draftText,
  );
  storage.deactivate();
});
it("shows readable save errors instead of exposing validation JSON", async () => {
  const saved = savedFixture();
  saved.messages = [{ role: "user", content: "x".repeat(8_001) }];
  const storage = createInterviewStorage(crypto.randomUUID());
  await expect(storage.saveInterview(saved)).rejects.toThrow(
    "couldn't be saved",
  );
  storage.deactivate();
});
