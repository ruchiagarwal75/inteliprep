"use client";

import { useCallback, useRef, useState } from "react";
import type { InterviewSaveUpdate } from "@/lib/saved-interview";

export function useChatDraft(
  initial: string,
  onSave: (update: InterviewSaveUpdate) => Promise<void>,
) {
  const [input, setValue] = useState(initial);
  const inputRef = useRef(initial);
  const setInput = useCallback(
    (value: string) => {
      inputRef.current = value;
      setValue(value);
      // Write on change so the deadline or a refresh cannot discard a paused draft.
      void onSave({ draftText: value });
    },
    [onSave],
  );
  const getDraft = useCallback(() => inputRef.current, []);
  return { input, setInput, getDraft };
}
