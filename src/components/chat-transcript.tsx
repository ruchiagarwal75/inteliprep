import type { RefObject } from "react";
import type { ChatMessage } from "@/lib/chat";

type ChatTranscriptProps = {
  logRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  error: string | null;
  imageWarning: string | null;
};

export function ChatTranscript({
  logRef,
  messages,
  error,
  imageWarning,
}: ChatTranscriptProps) {
  return (
    <div
      ref={logRef}
      aria-live="polite"
      className="flex-1 space-y-3 overflow-y-auto p-3"
    >
      {messages.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">
          Choose a problem and difficulty, then select Start interview.
        </p>
      )}
      {messages.map((message, index) => (
        <div
          key={index}
          className={message.role === "user" ? "text-right" : "text-left"}
        >
          <span
            className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-left text-sm whitespace-pre-wrap ${message.role === "user" ? "bg-foreground text-background" : "bg-black/5 dark:bg-white/10"}`}
          >
            {message.content || "…"}
          </span>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {imageWarning && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {imageWarning}
        </p>
      )}
    </div>
  );
}
