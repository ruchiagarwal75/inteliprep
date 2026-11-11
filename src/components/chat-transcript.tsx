"use client";

import { useEffect, type RefObject } from "react";
import type { ChatMessage } from "@/lib/chat";
import { interviewerChatText } from "@/lib/chat-display";

type ChatTranscriptProps = {
  logRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  pendingMessageIndex?: number;
  imageWarning: string | null;
  isStreaming?: boolean;
  openingMessage?: string;
};

export function ChatTranscript({
  logRef,
  messages,
  pendingMessageIndex,
  imageWarning,
  isStreaming = false,
  openingMessage,
}: ChatTranscriptProps) {
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight });
  }, [messages, logRef, isStreaming]);
  return (
    <div
      ref={logRef}
      aria-live="polite"
      className="chat-transcript min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3"
    >
      {messages.length === 0 && (
        <p className="text-muted text-sm">
          Choose a problem and difficulty, then select Start interview.
        </p>
      )}
      {messages.map((message, index) => {
        if (message.source === "control") return null;
        const content =
          message.role === "assistant"
            ? interviewerChatText(
                message.content,
                index === 0 ? openingMessage : undefined,
              )
            : message.content;
        if (!content && !isStreaming) return null;
        if (!content) return null;
        return (
          <article
            key={index}
            className={`chat-message chat-message-${message.role}`}
          >
            {message.role === "assistant" && (
              <div className="interviewer-identity">
                <span className="interviewer-avatar" aria-hidden="true">
                  M
                </span>
                <span>MockMeAI interviewer</span>
              </div>
            )}
            <div className="chat-bubble">{content}</div>
            {index === pendingMessageIndex && (
              <p className="chat-pending">Awaiting reply</p>
            )}
          </article>
        );
      })}
      {isStreaming && (
        <p role="status" className="text-muted flex items-center gap-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
          {messages.at(-1)?.role === "assistant" && messages.at(-1)?.content
            ? "Interviewer is replying…"
            : "Interviewer is thinking…"}
        </p>
      )}
      {imageWarning && (
        <p role="status" className="text-warning text-sm">
          {imageWarning}
        </p>
      )}
    </div>
  );
}
