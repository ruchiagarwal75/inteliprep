import { expect, it, vi } from "vitest";
import { startInterview } from "@/lib/start-interview";
import { savedFixture } from "@/lib/fixtures/saved-interview-test";
import { interviewRecordStarter } from "@/components/interview-record-starter";
import type { SavedInterview } from "@/lib/saved-interview";

function fixture() {
  const old = savedFixture();
  old.hasEnded = true;
  let scene = old.whiteboard;
  let opened = old;
  const savedRef: { current: SavedInterview | undefined } = { current: old };
  const dirtyRef = { current: false };
  const autosave = {
    savedRef,
    dirtyRef,
    conflictedRef: { current: false },
    openingRef: { current: false },
    queueRef: { current: Promise.resolve() },
    save: vi.fn(async () => {
      dirtyRef.current = false;
    }),
  };
  const onOpened = vi.fn((saved: SavedInterview) => {
    opened = saved;
  });
  const records = interviewRecordStarter({
    autosave,
    getScene: () => scene,
    restoreScene: (next) => {
      scene = next;
    },
    onOpened,
    onUnblocked: () => {},
    onUrl: () => {},
  });
  return {
    old,
    autosave,
    records,
    onOpened,
    scene: () => scene,
    opened: () => opened,
  };
}
const choice = {
  problemId: "url-shortener",
  level: "mid" as const,
  durationMinutes: 45 as const,
};
it("keeps the old workspace until the server succeeds, then opens one fresh board", async () => {
  const f = fixture();
  const next = savedFixture().interview;
  const request = vi.fn<typeof fetch>(async () => Response.json(next));
  expect(await f.records.prepareReplacement()).toBe(true);
  expect(f.opened()).toBe(f.old);
  expect(f.scene()).toBe(f.old.whiteboard);
  await startInterview({
    choice,
    replace: true,
    request,
    prepareReplacement: f.records.prepareReplacement,
    commit: f.records.start,
  });
  expect(f.onOpened).toHaveBeenCalledOnce();
  expect(f.opened().messages).toEqual([next.openingMessage]);
  expect(f.opened().whiteboard.elements).toEqual([]);
  expect(f.scene().elements).toEqual([]);
  expect(f.old.whiteboard.elements.length).toBeGreaterThan(0);
});
it("preserves the existing interview and drawing when the start request fails", async () => {
  const f = fixture();
  const request = vi.fn<typeof fetch>(async () =>
    Response.json({ error: "Unavailable" }, { status: 503 }),
  );
  await expect(
    startInterview({
      choice,
      replace: true,
      request,
      prepareReplacement: f.records.prepareReplacement,
      commit: f.records.start,
    }),
  ).rejects.toThrow("Unavailable");
  expect(f.onOpened).not.toHaveBeenCalled();
  expect(f.opened()).toBe(f.old);
  expect(f.scene()).toBe(f.old.whiteboard);
});
it("blocks replacement of an active or unsaved interview before making a request", async () => {
  const f = fixture();
  const request = vi.fn<typeof fetch>();
  f.old.hasEnded = false;
  expect(
    await startInterview({
      choice,
      replace: true,
      request,
      prepareReplacement: f.records.prepareReplacement,
      commit: f.records.start,
    }),
  ).toBe(false);
  expect(request).not.toHaveBeenCalled();
  f.old.hasEnded = true;
  f.autosave.dirtyRef.current = true;
  f.autosave.save.mockImplementation(async () => {});
  expect(await f.records.prepareReplacement()).toBe(false);
  expect(f.onOpened).not.toHaveBeenCalled();
});
