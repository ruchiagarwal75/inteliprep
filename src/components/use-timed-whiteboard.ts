"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  captureWhiteboard,
  type WhiteboardScene,
} from "@/lib/whiteboard-snapshot";

/** Keep scoring and autosave on the same frozen native drawing after expiry. */
export function useTimedWhiteboard(
  getScene: () => WhiteboardScene,
  restoreScene: (scene: WhiteboardScene) => void,
  expired: boolean,
  isExpiredNow: () => boolean,
) {
  const frozenRef = useRef<WhiteboardScene | undefined>(undefined);
  const readScene = useCallback(() => {
    if (isExpiredNow() && !frozenRef.current) {
      frozenRef.current = captureWhiteboard(getScene());
      restoreScene(frozenRef.current);
    }
    return frozenRef.current ?? getScene();
  }, [getScene, restoreScene, isExpiredNow]);
  useEffect(() => {
    if (expired) readScene();
  }, [expired, readScene]);
  return readScene;
}
