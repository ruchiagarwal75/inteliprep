"use client";
import { useState } from "react";
import { ChatComposer } from "@/components/chat-composer";

import type { ChatPanelProps } from "@/components/interview-chat-options";
import { lastCandidateAction } from "@/lib/candidate-actions";
import { ChatTranscript } from "@/components/chat-transcript";
import { InterviewPacing } from "@/components/interview-pacing";
import { useInterviewChat } from "@/components/use-interview-chat";
import { useInterviewEnd } from "@/components/use-interview-end";
import { InterviewScorecard } from "@/components/interview-scorecard";
import { useInterviewAutoEnd } from "@/components/use-interview-auto-end";
import {
  InterviewEndControl,
  InterviewEndNotices,
} from "@/components/interview-end-control";
import { ExpiredDraft } from "@/components/expired-draft";
import { ChatReplyStatus } from "@/components/chat-reply-status";
import { useInterviewClosure } from "@/components/use-interview-closure";
import { InterviewRecoveryNotice } from "@/components/interview-recovery-notice";

export function ChatPanel(props: ChatPanelProps) {
  const { interview, hasDrawing, hasEnded } = props;
  const [recoveryFailure, onRecoveryFailure] = useState(
    props.restored?.recoveryFailure,
  );
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    pendingReply,
    retry,
    imageWarning,
    logRef,
    canSend,
    send,
    getDraft,
    setMessages,
  } = useInterviewChat({
    ...props,
    recoveryFailure,
    onRecoveryFailure,
    disabled: hasEnded || props.timeExpired || props.disabled,
  });
  const closure = useInterviewClosure(props, messages, getDraft);
  const ending = useInterviewEnd({
    ...props,
    recoveryFailure,
    onRecoveryFailure,
    messages,
    isReplying: isStreaming,
    onMessagesChange: setMessages,
    onDraftIncluded: () => setInput(""),
  });
  const mode =
    lastCandidateAction(messages) ??
    (props.phase?.position && props.phase.position > 1 ? "draw" : undefined);
  useInterviewAutoEnd(
    {
      expired: props.timeExpired,
      isReplying: isStreaming,
      isEnding: ending.isEnding,
      hasEnded,
      hasScorecard: Boolean(ending.scorecard),
      disabled:
        props.disabled ||
        Boolean(recoveryFailure) ||
        closure.closed ||
        !interview ||
        Boolean(input.trim()) ||
        Boolean(props.leaveAction),
    },
    async () => {
      if (!getDraft().trim()) await ending.end();
    },
  );
  const transcript = (
    <ChatTranscript
      logRef={logRef}
      messages={messages}
      pendingMessageIndex={hasEnded ? undefined : pendingReply?.messageIndex}
      imageWarning={imageWarning}
      isStreaming={isStreaming}
    />
  );
  return (
    <section
      aria-label="Chat"
      className="flex min-h-0 w-full flex-col rounded-lg border border-black/10 dark:border-white/15"
    >
      <header className="flex items-center justify-between gap-3 border-b border-black/10 px-3 py-2 dark:border-white/15">
        <h2 className="text-sm font-medium">
          {hasEnded ? "Interview results" : "Chat"}
          {!hasEnded && (
            <span className="ml-2 text-xs font-normal text-black/60 dark:text-white/60">
              {mode === "explain"
                ? "Explaining"
                : mode === "draw"
                  ? "Drawing · questions paused"
                  : mode === "review"
                    ? "Discussing your design"
                    : "Clarifying requirements"}
            </span>
          )}
        </h2>
        <InterviewEndControl
          {...props}
          ending={ending}
          isStreaming={isStreaming}
          draft={input}
          getDraft={getDraft}
          recoveryFailure={Boolean(recoveryFailure)}
          closure={closure}
        />
      </header>
      <InterviewRecoveryNotice
        failure={recoveryFailure}
        closed={closure.closed}
      />
      <InterviewEndNotices
        error={
          closure.error ??
          (recoveryFailure || closure.closed ? undefined : ending.error)
        }
        imageWarning={ending.imageWarning}
      />
      {ending.scorecard ? (
        <InterviewScorecard scorecard={ending.scorecard} scene={ending.scene}>
          {transcript}
        </InterviewScorecard>
      ) : (
        transcript
      )}
      {ending.isEnding && (
        <p
          role="status"
          className="border-t border-black/10 p-3 text-sm dark:border-white/15"
        >
          Your interview has ended. Reviewing your answers and final diagram…
        </p>
      )}
      {error && !hasEnded && !recoveryFailure && (
        <ChatReplyStatus
          error={error}
          pending={Boolean(pendingReply)}
          onRetry={props.timeExpired ? undefined : () => void retry()}
          disabled={props.disabled || isStreaming || ending.isEnding}
        />
      )}
      {props.timeExpired && !hasEnded && !recoveryFailure && input.trim() && (
        <ExpiredDraft
          draft={input}
          busy={props.disabled || isStreaming || ending.isEnding}
          onInclude={() => void ending.end(getDraft())}
          onSkip={() => void ending.end()}
        />
      )}
      {hasEnded && input.trim() && (
        <details className="shrink-0 border-t p-3 text-xs">
          <summary className="cursor-pointer">
            Saved unsent draft (not included in scoring)
          </summary>
          <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {input}
          </pre>
        </details>
      )}
      {!hasEnded && !props.timeExpired && (
        <>
          <InterviewPacing
            action={mode}
            hasDrawing={hasDrawing}
            disabled={
              !interview ||
              isStreaming ||
              ending.isEnding ||
              props.disabled ||
              Boolean(recoveryFailure) ||
              Boolean(pendingReply)
            }
            onChoose={(message, action) => void send(message, action)}
          />

          <ChatComposer
            input={input}
            onInput={setInput}
            onSend={() => void send()}
            disabled={!interview || props.disabled || Boolean(recoveryFailure)}
            canSend={canSend}
            started={Boolean(interview)}
          />
        </>
      )}
    </section>
  );
}
