"use client";

import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { InterviewStart } from "@/lib/interview-selection";
import type { InterviewPhase } from "@/lib/interview-phase";
import { lastCandidateAction } from "@/lib/candidate-actions";
import { ChatTranscript } from "@/components/chat-transcript";
import { InterviewPacing } from "@/components/interview-pacing";
import { useInterviewChat } from "@/components/use-interview-chat";

type ChatPanelProps = {
  getScene: () => WhiteboardScene;
  hasDrawing: boolean;
  interview?: InterviewStart;
  onBusyChange: (busy: boolean) => void;
  onPhaseChange: (phase: InterviewPhase) => void;
};

export function ChatPanel(props: ChatPanelProps) {
  const { interview, hasDrawing } = props;
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    imageWarning,
    logRef,
    canSend,
    send,
  } = useInterviewChat(props);
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
