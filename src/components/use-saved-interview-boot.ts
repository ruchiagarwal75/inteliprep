"use client";

import { useEffect } from "react";
import { listInterviews } from "@/lib/interview-storage";
import { initialInterviewId } from "@/lib/interview-navigation";
import type { SavedInterviewSummary } from "@/lib/saved-interview";

export function useSavedInterviewBoot({
  open,
  onHistory,
  onStatus,
  onError,
  onReady,
}: {
  open: (id: string, navigation: "replace") => Promise<boolean>;
  onHistory: (entries: SavedInterviewSummary[]) => void;
  onStatus: (value: string) => void;
  onError: (value: string) => void;
  onReady: (value: boolean) => void;
}) {
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const history = await listInterviews();
        const id = initialInterviewId(window.location.search, history);
        if (!mounted) return;
        onHistory(history);
        if (id) await open(id, "replace");
        else onStatus("Saved interviews stay in this browser");
      } catch (cause) {
        if (mounted) {
          onStatus("Browser saving unavailable");
          onError(
            cause instanceof Error
              ? cause.message
              : "Browser storage is unavailable.",
          );
        }
      } finally {
        if (mounted) onReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, onHistory, onStatus, onError, onReady]);
}
