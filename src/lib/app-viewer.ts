export const APP_VIEWER_STORAGE_KEY = "mockmeai:app-viewer:v1";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function existingAppViewerId(storage: Pick<Storage, "getItem">) {
  try {
    const id = storage.getItem(APP_VIEWER_STORAGE_KEY);
    return id && uuid.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

/** An anonymous browser ID, separate from interview records and account credentials. */
export function appViewerId(
  storage: Pick<Storage, "getItem" | "setItem">,
  makeId: () => string = () => crypto.randomUUID(),
): string | undefined {
  try {
    const existing = existingAppViewerId(storage);
    if (existing) return existing;
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
