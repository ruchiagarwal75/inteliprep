export const APP_VIEWER_STORAGE_KEY = "mockmeai:app-viewer:v1";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** An anonymous browser ID, separate from interview records and account credentials. */
export function appViewerId(
  storage: Pick<Storage, "getItem" | "setItem">,
  makeId: () => string = () => crypto.randomUUID(),
): string | undefined {
  try {
    const existing = storage.getItem(APP_VIEWER_STORAGE_KEY);
    if (existing && uuid.test(existing)) return existing;
    const id = makeId();
    if (!uuid.test(id)) return;
    storage.setItem(APP_VIEWER_STORAGE_KEY, id);
    return storage.getItem(APP_VIEWER_STORAGE_KEY) ?? undefined;
  } catch {
    return;
  }
}
export function isViewerEntry(path: string | null) {
  return (
    path === "/" ||
    path === "/sign-in" ||
    /^\/interview(?:\/|$)/u.test(path ?? "")
  );
}
