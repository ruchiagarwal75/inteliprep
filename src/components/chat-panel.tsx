"use client";

import { useRef, useState } from "react";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { ChatMessage } from "@/lib/chat";
import type { Scene } from "@/lib/scene";
import { prepareWhiteboardTurn } from "@/lib/whiteboard-turn";
import { receiveChatTurn } from "@/lib/chat-stream";
import { ChatTranscript } from "@/components/chat-transcript";
import type { InterviewStart } from "@/lib/interview-selection";
import {
  actionForTurn,
  lastCandidateAction,
  type CandidateAction,
} from "@/lib/candidate-actions";
import { InterviewPacing } from "@/components/interview-pacing";
import { drawingChanged, type PacingCapture } from "@/lib/pacing-capture";

type ChatPanelProps = {
  getScene: () => WhiteboardScene;
  hasDrawing: boolean;
  interview?: InterviewStart;
  onBusyChange: (busy: boolean) => void;
};

export function ChatPanel({
  getScene,
  hasDrawing,
  interview,
  onBusyChange,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    interview ? [interview.openingMessage] : [],
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const previousSceneRef = useRef<Scene | undefined>(undefined);
  const previousImageFingerprintRef = useRef<string | undefined>(undefined);
  const previousPacingCaptureRef = useRef<PacingCapture | undefined>(undefined);
  const sendingRef = useRef(false);

  // Spec: keep turns in order by blocking sends while the reply streams.
  const canSend = Boolean(interview) && input.trim().length > 0 && !isStreaming;

  async function send(
    content = input.trim(),
    requestedAction?: CandidateAction,
  ) {
    if (!interview || !content.trim() || isStreaming || sendingRef.current)
      return;
    sendingRef.current = true;
    onBusyChange(true);
    if (!requestedAction) setInput("");
    setError(null);
    setImageWarning(null);
    setIsStreaming(true);
    setMessages([
      ...messages,
      {
        role: "user",
        content: content.trim(),
        ...(requestedAction ? { action: requestedAction } : {}),
      },
    ]);

    try {
      const turn = await prepareWhiteboardTurn(
        getScene(),
        previousImageFingerprintRef.current,
      );
      const sentScene = turn.scene;
      const action = actionForTurn(
        content,
        requestedAction,
        lastCandidateAction(messages),
        drawingChanged(turn, previousPacingCaptureRef.current),
      );
      const next: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content: content.trim(),
          ...(action ? { action } : {}),
        },
      ];
      // Pacing tracks submitted edits even on failed replies; image/text delivery
      // baselines still advance only after a complete response.
      previousPacingCaptureRef.current = {
        scene: sentScene,
        fingerprint: turn.fingerprint,
      };
      setMessages(next);
      setImageWarning(turn.imageWarning ?? null);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Capture the drawing at send time so later edits don't change this turn.
        body: JSON.stringify({
          problemId: interview.problemId,
          level: interview.level,
          messages: next,
          scene: sentScene,
          previousScene: previousSceneRef.current,
          diagramImage: turn.diagramImage,
        }),
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
      await receiveChatTurn(
        response.body,
        sentScene,
        (chunk) => {
          setMessages((current) => {
            const last = current.at(-1);
            if (!last || last.role !== "assistant") return current;
            return [
              ...current.slice(0, -1),
              { ...last, content: last.content + chunk },
            ];
          });
          logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
        },
        (scene) => {
          previousSceneRef.current = scene;
          if (turn.canCommitImage)
            previousImageFingerprintRef.current = turn.fingerprint;
        },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      // Drop an empty assistant bubble so a failed turn can be retried.
      setMessages((current) =>
        current.at(-1)?.role === "assistant" && !current.at(-1)?.content.trim()
          ? current.slice(0, -1)
          : current,
      );
    } finally {
      sendingRef.current = false;
      onBusyChange(false);
      setIsStreaming(false);
    }
  }

  return (
    <section
      aria-label="Chat"
      className="flex min-h-0 w-full flex-col rounded-lg border border-black/10 dark:border-white/15"
    >
      <ChatTranscript
        logRef={logRef}
        messages={messages}
        error={error}
        imageWarning={imageWarning}
      />
      <InterviewPacing
        action={lastCandidateAction(messages)}
        hasDrawing={hasDrawing}
        disabled={!interview || isStreaming}
        onChoose={(message, action) => void send(message, action)}
      />

      <form
        className="flex gap-2 border-t border-black/10 p-3 dark:border-white/15"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          disabled={!interview}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            interview ? "Type your message" : "Start an interview to chat"
          }
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
