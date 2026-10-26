"use client";

import { useCallback, useEffect, useRef } from "react";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import { whiteboardContentKey } from "@/lib/whiteboard-snapshot";
import { reportClientError } from "@/lib/report-client-error";
import { InterviewStorageConflict } from "@/lib/interview-storage";
import { useCandidateAccount } from "@/components/candidate-account-context";
import {
  updateSavedInterview,
  type InterviewSaveUpdate,
  type SavedInterview,
  type SavedInterviewSummary,
} from "@/lib/saved-interview";

export function useInterviewAutosave({
  getScene,
  onStatus,
  onError,
  onBlocked,
  onHistory,
}: {
  getScene: () => WhiteboardScene;
  onStatus: (value: string) => void;
  onError: (value: string | undefined) => void;
  onBlocked: (value: boolean) => void;
  onHistory: (value: SavedInterviewSummary[]) => void;
}) {
  const { storage } = useCandidateAccount();
  const { listInterviews, saveInterview } = storage;
  const savedRef = useRef<SavedInterview | undefined>(undefined);
  const revisionsRef = useRef(new Map<string, string>());
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const dirtyRef = useRef(false);
  const conflictedRef = useRef(false);
  const openingRef = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const save = useCallback(
    (update: InterviewSaveUpdate = {}) => {
      const current = savedRef.current;
      if (!current || conflictedRef.current) return Promise.resolve();
      const snapshot = updateSavedInterview(current, update, getScene());
      savedRef.current = snapshot;
      dirtyRef.current = false;
      if (debounce.current) clearTimeout(debounce.current);
      onStatus("Saving…");
      const work = queueRef.current
        .then(async () => {
          if (conflictedRef.current) return;
          await saveInterview(snapshot, revisionsRef.current.get(snapshot.id));
          revisionsRef.current.set(snapshot.id, snapshot.revision);
          onHistory(await listInterviews());
          if (
            savedRef.current?.revision === snapshot.revision &&
            !dirtyRef.current
          )
            onStatus("Saved in this browser");
          onError(undefined);
        })
        .catch((cause: unknown) => {
          void reportClientError("storage", cause);
          dirtyRef.current = true;
          if (cause instanceof InterviewStorageConflict) {
            conflictedRef.current = true;
            onBlocked(true);
          }
          onStatus("Not saved");
          onError(
            cause instanceof Error
              ? cause.message
              : "Browser save failed. Your latest changes are still in memory.",
          );
        });
      queueRef.current = work;
      return work;
    },
    [
      getScene,
      onStatus,
      onError,
      onBlocked,
      onHistory,
      listInterviews,
      saveInterview,
    ],
  );

  const changed = useCallback(() => {
    if (
      !savedRef.current ||
      savedRef.current.hasEnded ||
      conflictedRef.current ||
      openingRef.current
    )
      return;
    const current = getScene();
    const saved = savedRef.current.whiteboard;
    const contentChanged =
      whiteboardContentKey(current) !== whiteboardContentKey(saved);
    const viewChanged =
      JSON.stringify(current.appState) !== JSON.stringify(saved.appState);
    if (!contentChanged && !viewChanged) return;
    if (!dirtyRef.current && contentChanged) onStatus("Saving…");
    dirtyRef.current = true;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void save(), 400);
  }, [save, onStatus, getScene]);

  const initialized = useCallback(
    (id?: string) => {
      if (
        !id ||
        savedRef.current?.id !== id ||
        dirtyRef.current ||
        conflictedRef.current
      )
        return;
      // The editor may migrate native fields or restore its viewport on mount.
      // Persist that normalized baseline without reporting an edit to the user.
      void save();
    },
    [save],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && !openingRef.current) void save();
    }, 10_000);
    const hide = () => {
      if (
        document.visibilityState === "hidden" &&
        dirtyRef.current &&
        !openingRef.current
      )
        void save();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", hide);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [save]);

  const getResumeToken = useCallback(
    () => savedRef.current?.interview.resumeToken,
    [],
  );
  return {
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
  };
}
