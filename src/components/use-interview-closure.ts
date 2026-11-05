"use client";

import { useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat";
import type { ChatPanelProps } from "@/components/interview-chat-options";

export function useInterviewClosure(
  props: ChatPanelProps,
  messages: ChatMessage[],
  getDraft: () => string,
) {
  const [closed, setClosed] = useState(
    props.restored?.closedWithoutScoring ?? false,
  );
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string>();
  const closingRef = useRef(false);
  async function close() {
    if (closed) return true;
    if (closingRef.current || props.disabled) return false;
    closingRef.current = true;
    setIsClosing(true);
    props.onBusyChange(true);
    setError(undefined);
    try {
      const saved = await props.onCloseWithoutScoring(messages, getDraft());
      if (!saved)
        throw new Error(
          "Your interview couldn't be saved. Retry save before closing.",
        );
      setClosed(true);
      props.onEndChange(true);
      props.onEndConfirmed(true);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn't close the interview. Please retry.",
      );
      return false;
    } finally {
      closingRef.current = false;
      setIsClosing(false);
      props.onBusyChange(false);
    }
  }
  return { close, closed, isClosing, error };
}
