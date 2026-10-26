"use client";

import { useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import type { InterviewStart } from "@/lib/interview-selection";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { ChatMessage } from "@/lib/chat";
import type { Scene } from "@/lib/scene";
import type { InterviewEndRequest } from "@/lib/interview-end";
import { prepareWhiteboardTurn } from "@/lib/whiteboard-turn";
import { interviewEndResponseSchema, type Scorecard } from "@/lib/scorecard";
import { captureScene } from "@/lib/scene-snapshot";
import { finalInterviewMessages } from "@/lib/final-interview-messages";
import type {
  SavedInterview,
  InterviewSaveUpdate,
} from "@/lib/saved-interview";

export function useInterviewEnd({
  getScene,
  interview,
  messages,
  isReplying,
  onBusyChange,
  onEndChange,
  onEndConfirmed,
  restored,
  onSave,
  getResumeToken,
  disabled = false,
  onMessagesChange,
  onDraftIncluded,
}: {
  getScene: () => WhiteboardScene;
  interview?: InterviewStart;
  messages: ChatMessage[];
  isReplying: boolean;
  onBusyChange: (busy: boolean) => void;
  onEndChange: (ended: boolean) => void;
  onEndConfirmed: (ended: boolean) => void;
  restored?: SavedInterview;
  onSave: (update: InterviewSaveUpdate) => Promise<void>;
  getResumeToken: () => string | undefined;
  disabled?: boolean;
  onMessagesChange: (messages: ChatMessage[]) => void;
  onDraftIncluded: () => void;
}) {
  const { request } = useCandidateAccount();
  const [isEnding, setIsEnding] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | undefined>(
    restored?.scorecard,
  );
  const [error, setError] = useState<string | undefined>(
    restored?.gradingError,
  );
  const [imageWarning, setImageWarning] = useState<string>();
  const [scene, setScene] = useState<Scene | undefined>(() =>
    restored?.hasEnded
      ? (restored.endRequest?.scene ??
        captureScene(restored.whiteboard.elements))
      : undefined,
  );
  const snapshotRef = useRef<InterviewEndRequest | undefined>(
    restored?.endRequest,
  );
  const endingRef = useRef(false);

  async function end(finalAnswer?: string): Promise<boolean> {
    if (scorecard) return true;
    if (!interview || isReplying || endingRef.current || disabled) return false;
    endingRef.current = true;
    setIsEnding(true);
    onBusyChange(true);
    onEndChange(true);
    setError(undefined);
    let submitted = false;
    try {
      if (!snapshotRef.current) {
        // A final assessment always gets a fresh PNG, even if chat omitted an unchanged one.
        const turn = await prepareWhiteboardTurn(getScene());
        snapshotRef.current = {
          problemId: interview.problemId,
          level: interview.level,
          sessionId: interview.sessionId,
          resumeToken: getResumeToken() ?? interview.resumeToken,
          messages: finalInterviewMessages(messages, finalAnswer),
          scene: turn.scene,
          diagramImage: turn.diagramImage,
        };
        setImageWarning(turn.imageWarning);
        setScene(turn.scene);
        onMessagesChange(snapshotRef.current.messages);
        await onSave({
          hasEnded: true,
          messages: snapshotRef.current.messages,
          endRequest: snapshotRef.current,
          endedAt: new Date().toISOString(),
          ...(finalAnswer?.trim() ? { draftText: "" } : {}),
        });
        if (finalAnswer?.trim()) onDraftIncluded();
      }
      submitted = true;
      const response = await request("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...snapshotRef.current,
          resumeToken: getResumeToken() ?? snapshotRef.current.resumeToken,
        }),
      });
      const body: unknown = await response.json();
      const resumeToken =
        body &&
        typeof body === "object" &&
        "resumeToken" in body &&
        typeof body.resumeToken === "string"
          ? body.resumeToken
          : undefined;
      if (!response.ok) {
        const detail = body && typeof body === "object" ? body : {};
        const ended = "ended" in detail && detail.ended === true;
        onEndChange(ended);
        if (!ended) {
          snapshotRef.current = undefined;
          setScene(undefined);
        }
        await onSave({
          hasEnded: ended,
          endRequest: ended ? snapshotRef.current : undefined,
          resumeToken,
          gradingError:
            "error" in detail && typeof detail.error === "string"
              ? detail.error
              : "Scorecard generation failed.",
        });
        setError(
          "error" in detail && typeof detail.error === "string"
            ? detail.error
            : "The scorecard couldn't be generated. Please retry.",
        );
        onEndConfirmed(ended);
        return ended;
      }
      const parsed = interviewEndResponseSchema.safeParse(body);
      if (!parsed.success)
        throw new Error("The scorecard couldn't be read. Please retry.");
      setScorecard(parsed.data.scorecard);
      await onSave({
        hasEnded: true,
        scorecard: parsed.data.scorecard,
        endRequest: undefined,
        resumeToken,
        gradingError: undefined,
        endedAt: parsed.data.scorecard.endedAt,
      });
      onEndConfirmed(true);
      return true;
    } catch (cause) {
      // A disconnected response may already have ended the server session; retry the frozen snapshot.
      if (!submitted) onEndChange(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "The scorecard couldn't be generated. Please retry.",
      );
      await onSave({
        gradingError:
          cause instanceof Error
            ? cause.message
            : "Scorecard generation failed.",
      });
      return false;
    } finally {
      endingRef.current = false;
      setIsEnding(false);
      onBusyChange(false);
    }
  }

  return {
    end,
    isEnding,
    scorecard,
    error,
    imageWarning,
    scene,
  };
}
