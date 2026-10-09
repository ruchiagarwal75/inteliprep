"use client";

import { useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat";

async function* readTextStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  // Decodes incrementally so a multi-byte character split across two chunks
  // is not mangled.
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) yield text;
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Spec: keep turns in order by blocking sends while the reply streams.
  const canSend = input.trim().length > 0 && !isStreaming;

  async function send() {
    if (!canSend) return;
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    setMessages(next);
    setInput("");
    setError(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `scene` is omitted until the whiteboard exists.
        body: JSON.stringify({ messages: next }),
      });

      if (!response.ok || !response.body) {
        const detail = await response
          .json()
          .then((data) => (data as { error?: string }).error)
          .catch(() => null);
        throw new Error(detail ?? `Request failed (${response.status})`);
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: "" },
      ]);
      for await (const chunk of readTextStream(response.body)) {
        setMessages((current) => {
          const last = current.at(-1);
          if (!last || last.role !== "assistant") return current;
          return [
            ...current.slice(0, -1),
            { ...last, content: last.content + chunk },
          ];
        });
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      // Drop an empty assistant bubble so a failed turn can be retried.
      setMessages((current) =>
        current.at(-1)?.role === "assistant" && !current.at(-1)?.content
          ? current.slice(0, -1)
          : current,
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <section
      aria-label="Chat"
      className="flex min-h-0 w-full flex-col rounded-lg border border-black/10 dark:border-white/15"
    >
      <div
        ref={logRef}
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">
            Say hello to start the interview.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-left text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-black/5 dark:bg-white/10"
              }`}
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
      </div>

      <form
        className="flex gap-2 border-t border-black/10 p-3 dark:border-white/15"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type your message"
          aria-label="Message"
          className="min-w-0 flex-1 rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-40"
        >
          {isStreaming ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
