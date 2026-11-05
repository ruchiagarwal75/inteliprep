"use client";

import { useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import type { ChatMessage } from "@/lib/chat";
import type { Scene } from "@/lib/scene";
import { prepareWhiteboardTurn } from "@/lib/whiteboard-turn";
import { postChatTurn } from "@/lib/post-chat-turn";
import {
  restoredPendingReply,
  retryChatMessages,
  type PendingChatReply,
} from "@/lib/pending-chat-reply";
import { actionForTurn, type CandidateAction } from "@/lib/candidate-actions";
import type { PacingCapture } from "@/lib/pacing-capture";
import type { InterviewChatOptions } from "@/components/interview-chat-options";
import { useChatDraft } from "@/components/use-chat-draft";
import { InterviewRecoveryError } from "@/lib/interview-recovery";

export function useInterviewChat({
  getScene,
  interview,
  onBusyChange,
  onPhaseChange,
  disabled = false,
  restored,
  onSave,
  getResumeToken,
  canSubmit,
  recoveryFailure,
  onRecoveryFailure,
}: InterviewChatOptions) {
  const { request } = useCandidateAccount();
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => restored?.messages ?? (interview ? [interview.openingMessage] : []),
  );
  const { input, setInput, getDraft } = useChatDraft(
    restored?.draftText ?? "",
    onSave,
  );
  const [pendingReply, setPendingReply] = useState<
    PendingChatReply | undefined
  >(() => restoredPendingReply(restored));
  const [error, setError] = useState<string | null>(
    () => restoredPendingReply(restored)?.error ?? null,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const previousSceneRef = useRef<Scene | undefined>(restored?.previousScene);
  const previousImageFingerprintRef = useRef(
    restored?.previousImageFingerprint,
  );
  const previousPacingCaptureRef = useRef<PacingCapture | undefined>(
    restored?.pacingCapture,
  );
  const sendingRef = useRef(false);
  const canSend =
    Boolean(interview) &&
    !disabled &&
    !recoveryFailure &&
    input.trim().length > 0 &&
    !isStreaming &&
    !pendingReply;

  async function submit(next: ChatMessage[], clearDraft?: string) {
    if (
      !interview ||
      disabled ||
      recoveryFailure ||
      !canSubmit() ||
      isStreaming ||
      sendingRef.current
    )
      return;
    sendingRef.current = true;
    onBusyChange(true);
    setError(null);
    setImageWarning(null);
    setIsStreaming(true);
    const waiting: PendingChatReply = { messageIndex: next.length - 1 };
    setPendingReply(waiting);
    setMessages(next);
    if (clearDraft && getDraft().trim() === clearDraft) setInput("");
    let completed = false;
    try {
      const [turn] = await Promise.all([
        prepareWhiteboardTurn(getScene(), previousImageFingerprintRef.current),
        onSave({ messages: next, pendingReply: waiting }),
      ]);
      const sentScene = turn.scene;
      // Failed replies keep the prior delivery baselines, while pacing retains submitted edits.
      previousPacingCaptureRef.current = {
        scene: sentScene,
        fingerprint: turn.fingerprint,
      };
      setImageWarning(turn.imageWarning ?? null);
      await onSave({ pacingCapture: previousPacingCaptureRef.current });
      if (!canSubmit())
        throw new Error(
          "Time is up. Your interview will end after this turn finishes.",
        );
      const reply = await postChatTurn(
        request,
        {
          problemId: interview.problemId,
          level: interview.level,
          sessionId: interview.sessionId,
          resumeToken: getResumeToken() ?? interview.resumeToken,
          messages: next,
          scene: sentScene,
          previousScene: previousSceneRef.current,
          diagramImage: turn.diagramImage,
        },
        (listening) => {
          if (!listening)
            setMessages([...next, { role: "assistant", content: "" }]);
        },
        (chunk) =>
          setMessages((current) => {
            const last = current.at(-1);
            if (!last || last.role !== "assistant") return current;
            return [
              ...current.slice(0, -1),
              { ...last, content: last.content + chunk },
            ];
          }),
      );
      completed = true;
      previousSceneRef.current = sentScene;
      onPhaseChange(reply.phase);
      if (turn.canCommitImage)
        previousImageFingerprintRef.current = turn.fingerprint;
      const finished: ChatMessage[] = reply.listening
        ? next
        : [...next, { role: "assistant", content: reply.reply }];
      setMessages(finished);
      setPendingReply(undefined);
      await onSave({
        messages: finished,
        pendingReply: undefined,
        phase: reply.phase,
        resumeToken: reply.resumeToken,
        previousScene: sentScene,
        previousImageFingerprint: previousImageFingerprintRef.current,
      });
    } catch (cause) {
      const failure =
        cause instanceof InterviewRecoveryError ? cause.failure : undefined;
      if (failure) onRecoveryFailure?.(failure);
      const detail =
        cause instanceof Error
          ? cause.message.slice(0, 1_000)
          : "Interviewer unavailable. Please try again.";
      setError(detail);
      if (!completed) {
        const failed = { ...waiting, error: detail };
        setPendingReply(failed);
        setMessages(next);
        await onSave({
          messages: next,
          pendingReply: failed,
          ...(failure ? { recoveryFailure: failure } : {}),
        }).catch(() => {});
      }
    } finally {
      sendingRef.current = false;
      onBusyChange(false);
      setIsStreaming(false);
    }
  }

  async function send(
    content = input.trim(),
    requestedAction?: CandidateAction,
  ) {
    if (pendingReply || !content.trim()) return;
    const action = actionForTurn(content, requestedAction);
    await submit(
      [
        ...messages,
        {
          role: "user",
          content: content.trim(),
          ...(action ? { action } : {}),
          ...(requestedAction ? { source: "control" as const } : {}),
        },
      ],
      requestedAction ? undefined : content.trim(),
    );
  }
  async function retry() {
    if (pendingReply) await submit(retryChatMessages(messages, pendingReply));
  }

  return {
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
  };
}
