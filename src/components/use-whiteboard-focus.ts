"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isWhiteboardFocusShortcut,
  readWhiteboardFocus,
  writeWhiteboardFocus,
} from "@/lib/whiteboard-focus";

export function useWhiteboardFocus(onRestore: () => void) {
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);
  const toggle = useCallback(() => {
    const next = !focusedRef.current;
    focusedRef.current = next;
    setFocused(next);
    if (!next) onRestore();
    try {
      writeWhiteboardFocus(window.localStorage, next);
    } catch {
      /* Accessing localStorage itself can also be blocked. */
    }
  }, [onRestore]);
  useEffect(() => {
    try {
      focusedRef.current = readWhiteboardFocus(window.localStorage);
      setFocused(focusedRef.current);
    } catch {
      /* Leave chat visible when preferences are unavailable. */
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !isWhiteboardFocusShortcut(event) ||
        !window.matchMedia("(min-width: 900px)").matches ||
        (event.target instanceof Element &&
          event.target.closest("input, textarea, [contenteditable='true']"))
      )
        return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);
  return { focused, focusedRef, toggle };
}
