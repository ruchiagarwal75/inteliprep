"use client";
import { useSearchParams } from "next/navigation";
import { InterviewMascot } from "@/components/interview-mascot";
import { SlowReply } from "@/components/slow-reply";
import { useAutomaticScorecard } from "@/components/use-automatic-scorecard";
import { createPortal } from "react-dom";
import { hasExplanation } from "@/lib/open-question";
import { InterviewResults } from "@/components/interview-results";
import { useState } from "react";
import { ChatComposer } from "@/components/chat-composer";

import type { ChatPanelProps } from "@/components/interview-chat-options";
import { lastCandidateAction } from "@/lib/candidate-actions";
import { ChatTranscript } from "@/components/chat-transcript";
import { InterviewPacing } from "@/components/interview-pacing";
import { useInterviewChat } from "@/components/use-interview-chat";
import { useInterviewEnd } from "@/components/use-interview-end";

import { useInterviewAutoEnd } from "@/components/use-interview-auto-end";
import {
  InterviewEndControl,
  InterviewEndNotices,
} from "@/components/interview-end-control";
import { ExpiredDraft } from "@/components/expired-draft";
import { ChatReplyStatus } from "@/components/chat-reply-status";
import { useInterviewClosure } from "@/components/use-interview-closure";
import { InterviewRecoveryNotice } from "@/components/interview-recovery-notice";
import {
  TranscriptSyncNotice,
  RecoveredInterviewMessages,
} from "@/components/transcript-sync-notice";

export function ChatPanel(props: ChatPanelProps) {
  const { interview, hasDrawing, hasEnded } = props;
  const mascotTest =
    useSearchParams()?.get("mascotTest") === "1" &&
    process.env.NODE_ENV === "development";
  const [recoveredMessages, setRecoveredMessages] = useState(
    props.restored?.recoveredMessages ?? [],
  );
  async function dismissRecovered(message: string) {
    const next = recoveredMessages.filter((m) => m !== message);
    setRecoveredMessages(next);
    await props.onSave({ recoveredMessages: next });
  }
  const [recoveryFailure, onRecoveryFailure] = useState(
    props.restored?.recoveryFailure,
  );
  const [transcriptConflict, setTranscriptConflict] = useState(
    props.restored?.transcriptConflict ?? false,
  );
  const onSyncRequired = () => setTranscriptConflict(true);
  const syncRequired = transcriptConflict || Boolean(props.storageConflict);
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    pendingReply,
    retry,
    retrySlowReply,
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
    onSyncRequired,
    onAssistantMessage: props.onAssistantMessage,
    disabled: hasEnded || props.timeExpired || props.disabled || syncRequired,
  });
  const closure = useInterviewClosure(props, messages, getDraft);
  const ending = useInterviewEnd({
    ...props,
    recoveryFailure,
    onRecoveryFailure,
    onSyncRequired,
    disabled: props.disabled || syncRequired,
    messages,
    isReplying: isStreaming,
    onMessagesChange: setMessages,
    onDraftIncluded: () => setInput(""),
  });
  const mode =
    lastCandidateAction(messages) ??
    (props.phase?.position && props.phase.position > 1 ? "draw" : undefined);
  useAutomaticScorecard(
    hasEnded,
    ending.isEnding,
    Boolean(ending.scorecard),
    closure.closed ||
      Boolean(recoveryFailure) ||
      syncRequired ||
      props.disabled,
    ending.end,
  );
  useInterviewAutoEnd(
    {
      expired: props.timeExpired,
      isReplying: isStreaming,
      isEnding: ending.isEnding,
      hasEnded,
      hasScorecard: Boolean(ending.scorecard),
      disabled:
        props.disabled ||
        syncRequired ||
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
      openingMessage={interview?.openingMessage.content}
      pendingMessageIndex={hasEnded ? undefined : pendingReply?.messageIndex}
      imageWarning={imageWarning}
      isStreaming={isStreaming}
    />
  );
  return (
    <section
      aria-label="Chat"
      className={`chat-panel flex min-h-0 w-full flex-col ${hasEnded ? "results-panel" : ""}`}
    >
      {!hasEnded && interview?.timing && (
        <InterviewMascot
          sessionId={interview.sessionId}
          startedAt={interview.timing.startedAt}
          deadlineAt={interview.timing.deadlineAt}
          clockOffsetMs={props.restored?.clockOffsetMs ?? 0}
          paused={false}
          testMode={mascotTest}
          immediate={mascotTest}
          blocked={
            mode === "draw" ||
            mode === "explain" ||
            isStreaming ||
            ending.isEnding ||
            props.disabled ||
            syncRequired ||
            Boolean(recoveryFailure) ||
            closure.closed ||
            props.timeExpired
          }
        />
      )}
      {props.endControlTarget &&
        createPortal(
          <InterviewEndControl
            {...props}
            disabled={props.disabled || syncRequired}
            ending={ending}
            isStreaming={isStreaming}
            draft={input}
            getDraft={getDraft}
            recoveryFailure={Boolean(recoveryFailure)}
            closure={closure}
          />,
          props.endControlTarget,
        )}
      {!hasEnded && props.brief && (
        <details className="chat-problem-brief">
          <summary>
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="m6 3 5 5-5 5" />
            </svg>
            Problem brief
          </summary>
          <p className="chat-problem-content">{props.brief}</p>
        </details>
      )}
      {syncRequired && !recoveryFailure && props.onLoadLatest && (
        <TranscriptSyncNotice
          storageConflict={props.storageConflict}
          disabled={isStreaming || ending.isEnding}
          onLoad={() =>
            props.onLoadLatest?.(messages, getDraft()) ?? Promise.resolve(false)
          }
        />
      )}
      <RecoveredInterviewMessages
        messages={recoveredMessages}
        disabled={
          hasEnded || isStreaming || Boolean(pendingReply) || syncRequired
        }
        onDismiss={(message) => void dismissRecovered(message)}
        onResend={(message) => {
          void send(message);
          void dismissRecovered(message);
        }}
      />
      <InterviewRecoveryNotice
        failure={recoveryFailure}
        closed={closure.closed}
      />
      <InterviewEndNotices
        error={
          closure.error ??
          (hasEnded || recoveryFailure || closure.closed || syncRequired
            ? undefined
            : ending.error)
        }
        imageWarning={ending.imageWarning}
      />
      {hasEnded ? (
        <InterviewResults
          scorecard={ending.scorecard}
          interview={interview}
          scene={ending.scene}
          whiteboard={props.getScene()}
          messages={messages}
          retry={() => void ending.end()}
          busy={ending.isEnding}
          closed={closure.closed}
          error={ending.error}
          endedAt={ending.endedAt}
        />
      ) : (
        transcript
      )}
      {ending.isEnding && !hasEnded && (
        <p
          role="status"
          className="border-t border-black/10 p-3 text-sm dark:border-white/15"
        >
          Your interview has ended. Reviewing your answers and final diagram…
        </p>
      )}
      {isStreaming && <SlowReply onRetry={retrySlowReply} />}
      {error && !hasEnded && !recoveryFailure && !syncRequired && (
        <ChatReplyStatus
          error={error}
          pending={Boolean(pendingReply)}
          onRetry={props.timeExpired ? undefined : () => void retry()}
          disabled={props.disabled || isStreaming || ending.isEnding}
          retryAt={pendingReply?.retryAt}
        />
      )}
      {props.timeExpired &&
        !hasEnded &&
        !recoveryFailure &&
        !syncRequired &&
        input.trim() && (
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
            hasExplanation={hasExplanation(messages)}
            disabled={
              !interview ||
              isStreaming ||
              ending.isEnding ||
              props.disabled ||
              Boolean(recoveryFailure) ||
              Boolean(pendingReply) ||
              syncRequired
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
            secondary={mode === "draw" || mode === "explain"}
          />
        </>
      )}
    </section>
  );
}
