"use client";
import { MAX_CHAT_LENGTH } from "@/lib/chat-draft";

export function ChatComposer({
  input,
  onInput,
  onSend,
  disabled,
  canSend,
  started,
  secondary = false,
}: {
  input: string;
  onInput: (text: string) => void;
  onSend: () => void;
  disabled: boolean;
  canSend: boolean;
  started: boolean;
  secondary?: boolean;
}) {
  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!input.trim()) onInput("");
        else onSend();
      }}
    >
      <textarea
        rows={2}
        value={input}
        maxLength={MAX_CHAT_LENGTH}
        aria-describedby={
          input.length >= MAX_CHAT_LENGTH ? "draft-length-hint" : undefined
        }
        disabled={disabled}
        onChange={(event) => onInput(event.target.value)}
        onBlur={() => {
          if (input && !input.trim()) onInput("");
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            if (canSend) onSend();
            else if (!input.trim()) onInput("");
          }
        }}
        placeholder={
          started
            ? "Type your message · Shift+Enter for a new line"
            : "Start an interview to chat"
        }
        aria-label="Message"
        className="min-w-0 flex-1 resize-y rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
      />
      <button
        type="submit"
        disabled={!canSend}
        className={secondary ? "practice-secondary" : "practice-primary"}
      >
        Send
      </button>
      {input.length >= MAX_CHAT_LENGTH && (
        <p
          id="draft-length-hint"
          role="status"
          className="w-full text-xs text-black/60 dark:text-white/60"
        >
          Message limit reached (8,000 characters). Shorten your message to add
          more.
        </p>
      )}
    </form>
  );
}
