import { describe, expect, it, vi } from "vitest";
import {
  isWhiteboardFocusShortcut,
  readWhiteboardFocus,
  WHITEBOARD_FOCUS_KEY,
  writeWhiteboardFocus,
} from "@/lib/whiteboard-focus";

describe("whiteboard focus preference", () => {
  it.each([null, "false", "invalid"])("keeps chat visible for %s", (value) => {
    expect(readWhiteboardFocus({ getItem: () => value })).toBe(false);
  });
  it("restores focus only for the saved true value", () => {
    const getItem = vi.fn(() => "true");
    expect(readWhiteboardFocus({ getItem })).toBe(true);
    expect(getItem).toHaveBeenCalledWith(WHITEBOARD_FOCUS_KEY);
  });
  it.each([true, false])(
    "saves %s without changing interview data",
    (value) => {
      const setItem = vi.fn();
      writeWhiteboardFocus({ setItem }, value);
      expect(setItem).toHaveBeenCalledExactlyOnceWith(
        WHITEBOARD_FOCUS_KEY,
        String(value),
      );
    },
  );
  it("tolerates blocked preference storage", () => {
    const blocked = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    expect(readWhiteboardFocus({ getItem: blocked })).toBe(false);
    expect(() =>
      writeWhiteboardFocus({ setItem: blocked }, true),
    ).not.toThrow();
  });
});

it("uses only Alt+Shift+F, without repeating while held", () => {
  const shortcut = {
    code: "KeyF",
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    repeat: false,
  };
  expect(isWhiteboardFocusShortcut(shortcut)).toBe(true);
  for (const other of [
    { code: "KeyB" },
    { altKey: false },
    { shiftKey: false },
    { ctrlKey: true },
    { metaKey: true },
    { repeat: true },
  ])
    expect(isWhiteboardFocusShortcut({ ...shortcut, ...other })).toBe(false);
});
