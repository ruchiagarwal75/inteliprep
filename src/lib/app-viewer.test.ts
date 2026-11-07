import { expect, it } from "vitest";
import {
  appViewerId,
  APP_VIEWER_STORAGE_KEY,
  isViewerEntry,
} from "@/lib/app-viewer";
it("keeps the same browser identity across refreshes without touching interview storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  const id = "11111111-1111-4111-8111-111111111111";
  expect(appViewerId(storage, () => id)).toBe(id);
  expect(appViewerId(storage, () => crypto.randomUUID())).toBe(id);
  expect([...values.keys()]).toEqual([APP_VIEWER_STORAGE_KEY]);
});
it("skips tracking rather than making a new visitor on every load when storage is blocked", () => {
  const storage = {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {},
  };
  expect(appViewerId(storage)).toBeUndefined();
});
it("tracks app entry pages but does not count admin or preview-tool visits", () => {
  for (const path of [
    "/",
    "/sign-in",
    "/interview",
    "/interview/new",
    "/interview/id/results",
  ])
    expect(isViewerEntry(path)).toBe(true);
  for (const path of [
    "/admin",
    "/admin/users/id",
    "/mascot-preview",
    "/api/admin/visitors",
    null,
  ])
    expect(isViewerEntry(path)).toBe(false);
});
