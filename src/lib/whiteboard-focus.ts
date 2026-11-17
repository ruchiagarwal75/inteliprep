export const WHITEBOARD_FOCUS_KEY = "shardling:whiteboard-focus";

export function readWhiteboardFocus(storage: Pick<Storage, "getItem">) {
  try {
    return storage.getItem(WHITEBOARD_FOCUS_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeWhiteboardFocus(
  storage: Pick<Storage, "setItem">,
  focused: boolean,
) {
  try {
    storage.setItem(WHITEBOARD_FOCUS_KEY, String(focused));
  } catch {
    /* Focus mode still works without browser storage. */
  }
}

export function isWhiteboardFocusShortcut(
  event: Pick<
    KeyboardEvent,
    "code" | "altKey" | "shiftKey" | "ctrlKey" | "metaKey" | "repeat"
  >,
) {
  return (
    event.code === "KeyF" &&
    event.altKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.repeat
  );
}
