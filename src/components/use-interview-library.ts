"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { interviewHref } from "@/lib/interview-navigation";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import { useCandidateAccount } from "@/components/candidate-account-context";
import {
  type SavedInterview,
  type SavedInterviewSummary,
} from "@/lib/saved-interview";
import { openInterviewRecord } from "@/components/interview-record-opener";
import { useInterviewAutosave } from "@/components/use-interview-autosave";
import { updateInterviewUrl as updateUrl } from "@/components/use-interview-navigation";
import { useSavedInterviewBoot } from "@/components/use-saved-interview-boot";
import { interviewRecordStarter } from "@/components/interview-record-starter";

export function useInterviewLibrary(
  getScene: () => WhiteboardScene,
  restoreScene: (scene: WhiteboardScene) => void,
  sessionId?: string,
) {
  const router = useRouter();
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
  const autosave = useInterviewAutosave({
    getScene,
    onStatus: setStatus,
    onError: setError,
    onBlocked: setBlocked,
    onHistory: setEntries,
  });
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
    closeWithoutScoring,
  } = autosave;

  const open = useCallback(
    (id: string, navigation: "push" | "replace" | "none" = "push") =>
      openInterviewRecord(
        {
          autosave: {
            savedRef,
            revisionsRef,
            queueRef,
            dirtyRef,
            conflictedRef,
            openingRef,
            save,
          },
          storage: { readInterview, selectInterview },
          request,
          getScene,
          restoreScene,
          onOpened: setOpened,
          onBlocked: setBlocked,
          onError: setError,
          onOpening: setIsOpening,
          onUrl: updateUrl,
        },
        id,
        navigation,
      ),
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
      getScene,
    ],
  );

  useSavedInterviewBoot({
    sessionId,
    open,
    onHistory: setEntries,
    onStatus: setStatus,
    onError: setError,
    onReady: setReady,
  });

  const { start, prepareReplacement } = interviewRecordStarter({
    autosave,
    getScene,
    restoreScene,
    onOpened: setOpened,
    onUnblocked: () => setBlocked(false),
    onUrl: (id) => router.push(interviewHref(id)),
  });

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
  async function loadLatest(
    messages: SavedInterview["messages"],
    draftText: string,
  ) {
    const saved = savedRef.current;
    if (!saved) return false;
    const latest = (await listInterviews()).find(
      (entry) => entry.problemId === saved.interview.problemId,
    );
    if (latest && latest.id !== saved.id) return open(latest.id, "replace");
    savedRef.current = {
      ...saved,
      messages,
      draftText,
      transcriptConflict: true,
    };
    return open(saved.id, "none");
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
    closeWithoutScoring,
    prepareReplacement,
    loadLatest,
  };
}
