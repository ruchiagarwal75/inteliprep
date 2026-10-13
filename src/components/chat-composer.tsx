"use client";

export function ChatComposer({
  input,
  onInput,
  onSend,
  disabled,
  canSend,
  started,
}: {
  input: string;
  onInput: (text: string) => void;
  onSend: () => void;
  disabled: boolean;
  canSend: boolean;
  started: boolean;
}) {
  return (
    <form
      className="flex shrink-0 gap-2 border-t border-black/10 p-3 dark:border-white/15"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <textarea
        rows={2}
        value={input}
        maxLength={8_000}
        disabled={disabled}
        onChange={(event) => onInput(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            if (canSend) onSend();
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
        className="bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
