"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { InterviewSaveUpdate } from "@/lib/saved-interview";
import { boundedChatDraft } from "@/lib/chat-draft";
import { browserDraftJournal } from "@/lib/draft-journal";
import { useCandidateAccount } from "@/components/candidate-account-context";

export function useChatDraft(
  initial: string,
  onSave: (update: InterviewSaveUpdate) => Promise<void>,
  sessionId?: string,
) {
  const { userId } = useCandidateAccount();
  const [journal] = useState(() => browserDraftJournal(userId, sessionId));
  const [input, setValue] = useState(
    () => journal?.read(initial) ?? boundedChatDraft(initial),
  );
  const inputRef = useRef(input);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setInput = useCallback(
    (value: string) => {
      const draft = boundedChatDraft(value);
      inputRef.current = draft;
      setValue(draft);
      journal?.write(draft);
      clearTimeout(debounce.current);
      debounce.current = setTimeout(
        () => void onSave({ draftText: inputRef.current }).catch(() => {}),
        300,
      );
    },
    [onSave, journal],
  );
  useEffect(() => {
    const flush = () => {
      journal?.write(inputRef.current);
      void onSave({ draftText: inputRef.current }).catch(() => {});
    };
    const hide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(debounce.current);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [journal, onSave]);
  const getDraft = useCallback(() => inputRef.current, []);
  return { input, setInput, getDraft };
}
