"use client";

import { useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat";
import type { Scene } from "@/lib/scene";
import { prepareWhiteboardTurn } from "@/lib/whiteboard-turn";
import {
  INTERVIEW_STREAM_TYPE,
  receiveInterviewStream,
} from "@/lib/interview-stream";
import { actionForTurn, type CandidateAction } from "@/lib/candidate-actions";
import type { PacingCapture } from "@/lib/pacing-capture";

import type { InterviewChatOptions } from "@/components/interview-chat-options";
import { useChatDraft } from "@/components/use-chat-draft";
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
}: InterviewChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => restored?.messages ?? (interview ? [interview.openingMessage] : []),
  );
  const { input, setInput, getDraft } = useChatDraft(
    restored?.draftText ?? "",
    onSave,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const previousSceneRef = useRef<Scene | undefined>(restored?.previousScene);
  const previousImageFingerprintRef = useRef<string | undefined>(
    restored?.previousImageFingerprint,
  );
  const previousPacingCaptureRef = useRef<PacingCapture | undefined>(
    restored?.pacingCapture,
  );
  const sendingRef = useRef(false);

  // Spec: keep turns in order by blocking sends while the reply streams.
  const canSend =
    Boolean(interview) && !disabled && input.trim().length > 0 && !isStreaming;

  async function send(
    content = input.trim(),
    requestedAction?: CandidateAction,
  ) {
    if (
      !interview ||
      disabled ||
      !canSubmit() ||
      !content.trim() ||
      isStreaming ||
      sendingRef.current
    )
      return;
    sendingRef.current = true;
    onBusyChange(true);
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
      const action = actionForTurn(content, requestedAction);
      const next: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content: content.trim(),
          ...(action ? { action } : {}),
        },
      ];
      if (!requestedAction) setInput("");
      // Pacing tracks submitted edits even on failed replies; image/text delivery
      // baselines still advance only after a complete response.
      previousPacingCaptureRef.current = {
        scene: sentScene,
        fingerprint: turn.fingerprint,
      };
      setMessages(next);
      setImageWarning(turn.imageWarning ?? null);
      await onSave({
        messages: next,
        pacingCapture: previousPacingCaptureRef.current,
      });
      if (!canSubmit())
        throw new Error(
          "Time is up. Your interview will end after this turn finishes.",
        );
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: INTERVIEW_STREAM_TYPE,
        },
        // Capture the drawing at send time so later edits don't change this turn.
        body: JSON.stringify({
          problemId: interview.problemId,
          level: interview.level,
          sessionId: interview.sessionId,
          resumeToken: getResumeToken() ?? interview.resumeToken,
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
      const completed = await receiveInterviewStream(response.body, (chunk) => {
        setMessages((current) => {
          const last = current.at(-1);
          if (!last || last.role !== "assistant") return current;
          return [
            ...current.slice(0, -1),
            { ...last, content: last.content + chunk },
          ];
        });
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      });
      const phase = completed.checkpoint.phase;
      if (!phase || !completed.checkpoint.resumeToken)
        throw new Error("The interview checkpoint is missing. Please retry.");
      previousSceneRef.current = sentScene;
      onPhaseChange(phase);
      if (turn.canCommitImage)
        previousImageFingerprintRef.current = turn.fingerprint;
      const finished: ChatMessage[] = [
        ...next,
        { role: "assistant", content: completed.reply },
      ];
      setMessages(finished);
      await onSave({
        messages: finished,
        phase,
        resumeToken: completed.checkpoint.resumeToken,
        previousScene: sentScene,
        previousImageFingerprint: previousImageFingerprintRef.current,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      // Interrupted replies must not enter a later saved transcript as completed turns.
      setMessages((current) =>
        current.at(-1)?.role === "assistant" ? current.slice(0, -1) : current,
      );
    } finally {
      sendingRef.current = false;
      onBusyChange(false);
      setIsStreaming(false);
    }
  }

  return {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    imageWarning,
    logRef,
    canSend,
    send,
    getDraft,
    setMessages,
  };
}
