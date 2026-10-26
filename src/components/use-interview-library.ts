"use client";

import { useCallback, useState } from "react";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { InterviewStart } from "@/lib/interview-selection";
import { useCandidateAccount } from "@/components/candidate-account-context";
import {
  newSavedInterview,
  type SavedInterview,
  type SavedInterviewSummary,
} from "@/lib/saved-interview";
import { reconnectInterview } from "@/lib/reconnect-interview";
import { useInterviewAutosave } from "@/components/use-interview-autosave";
import { updateInterviewUrl as updateUrl } from "@/components/use-interview-navigation";
import { useSavedInterviewBoot } from "@/components/use-saved-interview-boot";

export function useInterviewLibrary(
  getScene: () => WhiteboardScene,
  restoreScene: (scene: WhiteboardScene) => void,
) {
  const { storage, request } = useCandidateAccount();
  const { deleteInterview, listInterviews, readInterview, selectInterview } =
    storage;
  const [opened, setOpened] = useState<SavedInterview>();
  const [entries, setEntries] = useState<SavedInterviewSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading saved interviews…");
  const [error, setError] = useState<string>();
  const [blocked, setBlocked] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const {
    savedRef,
    revisionsRef,
    queueRef,
    dirtyRef,
    conflictedRef,
    openingRef,
    save,
    changed,
    initialized,
    getResumeToken,
  } = useInterviewAutosave({
    getScene,
    onStatus: setStatus,
    onError: setError,
    onBlocked: setBlocked,
    onHistory: setEntries,
  });

  const open = useCallback(
    async (id: string, navigation: "push" | "replace" | "none" = "push") => {
      if (openingRef.current) return false;
      openingRef.current = true;
      setIsOpening(true);
      if (dirtyRef.current && !conflictedRef.current) await save();
      await queueRef.current;
      try {
        if (dirtyRef.current && !conflictedRef.current)
          throw new Error(
            "Your current interview couldn't be saved. Retry save before opening another interview.",
          );
        const saved = await readInterview(id);
        if (!saved)
          throw new Error("This saved interview is no longer available.");
        setError(undefined);
        await selectInterview(id);
        // Completed feedback remains viewable even when the server is offline.
        let restored = saved;
        let reconnectError: string | undefined;
        try {
          restored = await reconnectInterview(saved, request);
        } catch (cause) {
          reconnectError =
            cause instanceof Error
              ? cause.message
              : "Couldn't reconnect to the interviewer. Your browser copy is available.";
        }
        savedRef.current = restored;
        revisionsRef.current.set(id, saved.revision);
        dirtyRef.current = false;
        conflictedRef.current = false;
        setBlocked(false);
        restoreScene(restored.whiteboard);
        setOpened(restored);
        await save();
        if (reconnectError && !dirtyRef.current) setError(reconnectError);
        updateUrl(id, navigation);
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Couldn't open the saved interview.",
        );
        updateUrl(savedRef.current?.id, "replace");
        return false;
      } finally {
        openingRef.current = false;
        setIsOpening(false);
      }
    },
    [
      save,
      savedRef,
      revisionsRef,
      queueRef,
      dirtyRef,
      conflictedRef,
      openingRef,
      restoreScene,
      readInterview,
      selectInterview,
      request,
    ],
  );

  useSavedInterviewBoot({
    open,
    onHistory: setEntries,
    onStatus: setStatus,
    onError: setError,
    onReady: setReady,
  });

  async function start(interview: InterviewStart) {
    savedRef.current = newSavedInterview(interview, getScene());
    conflictedRef.current = false;
    setBlocked(false);
    setOpened(savedRef.current);
    await save();
    updateUrl(savedRef.current?.id, "push");
  }

  const reset = useCallback(
    async (discard = false, navigation: "push" | "none" = "push") => {
      if (openingRef.current) return false;
      openingRef.current = true;
      setIsOpening(true);
      try {
        if (dirtyRef.current) await save();
        await queueRef.current;
        if (dirtyRef.current && !conflictedRef.current && !discard) {
          updateUrl(savedRef.current?.id, "replace");
          return false;
        }
        try {
          await selectInterview();
          setStatus("Saved interviews stay in this browser");
        } catch {
          setError("Couldn't update browser storage.");
        }
        savedRef.current = undefined;
        dirtyRef.current = false;
        // Clear send-time scene data before remounting Excalidraw with an empty board.
        restoreScene({
          elements: [],
          appState: { viewBackgroundColor: "#ffffff" },
          files: {},
        });
        setOpened(undefined);
        setBlocked(false);
        conflictedRef.current = false;
        updateUrl(undefined, navigation);
        return true;
      } finally {
        openingRef.current = false;
        setIsOpening(false);
      }
    },
    [
      openingRef,
      dirtyRef,
      save,
      queueRef,
      conflictedRef,
      savedRef,
      restoreScene,
      selectInterview,
    ],
  );

  async function remove(id: string) {
    if (savedRef.current?.id === id) await reset(true);
    await queueRef.current;
    try {
      await deleteInterview(id);
      revisionsRef.current.delete(id);
      setEntries(await listInterviews());
    } catch {
      setError("Couldn't delete the saved interview.");
    }
  }

  return {
    opened,
    entries,
    ready,
    status,
    error,
    blocked,
    isOpening,
    save,
    changed,
    initialized,
    open,
    start,
    reset,
    remove,
    getResumeToken,
  };
}
