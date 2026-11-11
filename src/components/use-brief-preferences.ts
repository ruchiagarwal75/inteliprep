"use client";
import { problemTrack } from "@/lib/problem-track";
import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import type { InterviewChoice } from "@/components/use-interview-starter";
import type { ProblemSummary } from "@/lib/interview-selection";
import type { SavedInterviewSummary } from "@/lib/saved-interview";
import {
  briefDefaults,
  briefLevelKey,
  briefTrackKey,
} from "@/lib/brief-preferences";
export function useBriefPreferences(
  enabled: boolean,
  problems: ProblemSummary[],
  entries: SavedInterviewSummary[],
  setChoice: Dispatch<SetStateAction<InterviewChoice>>,
) {
  const { storage, userId } = useCandidateAccount();
  const touched = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      let stored: string | null = null;
      let track: string | null = null;
      try {
        stored = localStorage.getItem(briefLevelKey(userId));
        track = localStorage.getItem(briefTrackKey(userId));
      } catch {
        /* Optional browser preference. */
      }
      const latest = entries[0]
        ? await storage.readInterview(entries[0].id).catch(() => undefined)
        : undefined;
      if (!cancelled && !touched.current)
        setChoice(
          briefDefaults(
            problems,
            latest,
            entries[0],
            stored,
            new URLSearchParams(window.location.search).get("problem"),
            track,
            new URLSearchParams(window.location.search).get("track"),
            new URLSearchParams(window.location.search).get("level"),
          ),
        );
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, problems, entries, setChoice, storage, userId]);
  return useCallback(
    (choice: InterviewChoice) => {
      touched.current = true;
      try {
        localStorage.setItem(briefLevelKey(userId), choice.level);
        localStorage.setItem(
          briefTrackKey(userId),
          problemTrack(problems.find((p) => p.problemId === choice.problemId)),
        );
      } catch {
        /* Starting still works without preferences. */
      }
      setChoice(choice);
    },
    [setChoice, userId, problems],
  );
}
