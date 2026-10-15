"use client";

import { useCallback, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { Whiteboard } from "@/components/whiteboard";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import { InterviewSetup } from "@/components/interview-setup";
import type { ProblemSummary } from "@/lib/interview-selection";
import { hasSketch } from "@/lib/drawing-state";
import type { InterviewPhase } from "@/lib/interview-phase";
import { InterviewStage } from "@/components/interview-stage";
import type { useInterviewLibrary } from "@/components/use-interview-library";
import type { useInterviewStarter } from "@/components/use-interview-starter";
import { InterviewHistory } from "@/components/interview-history";
import type { SavedInterview } from "@/lib/saved-interview";
import { useInterviewTimer } from "@/components/use-interview-timer";
import { InterviewTimer } from "@/components/interview-timer";
import { useTimedWhiteboard } from "@/components/use-timed-whiteboard";

export function InterviewSessionWorkspace({
  saved,
  initialScene,
  problems,
  library,
  getScene,
  restoreScene,
  updateScene,
  starter,
  onBusy,
  onNew,
  onChangeProblem,
}: {
  saved?: SavedInterview;
  initialScene: WhiteboardScene;
  problems: ProblemSummary[];
  library: ReturnType<typeof useInterviewLibrary>;
  starter: ReturnType<typeof useInterviewStarter>;
  getScene: () => WhiteboardScene;
  restoreScene: (scene: WhiteboardScene) => void;
  updateScene: (scene: WhiteboardScene) => void;
  onBusy: (busy: boolean) => void;
  onNew: () => void;
  onChangeProblem: () => void;
}) {
  const interview = saved?.interview;
  const [phase, setPhase] = useState<InterviewPhase | undefined>(saved?.phase);
  const [isReplying, setIsReplying] = useState(false);
  const [hasEnded, setHasEnded] = useState(saved?.hasEnded ?? false);
  const [hasConfirmedEnd, setHasConfirmedEnd] = useState(
    saved?.hasEnded ?? false,
  );
  const [leaveAction, setLeaveAction] = useState<"new" | "problem">();
  const timer = useInterviewTimer(
    interview?.timing,
    saved?.clockOffsetMs,
    hasEnded,
  );
  const isExpiredNow = timer.isExpiredNow;
  const timedScene = useTimedWhiteboard(
    getScene,
    restoreScene,
    timer.expired,
    isExpiredNow,
  );
  const canSubmit = useCallback(
    () => !hasEnded && !isExpiredNow(),
    [hasEnded, isExpiredNow],
  );
  const [hasDrawing, setHasDrawing] = useState(
    hasSketch(initialScene.elements),
  );
  const hasDrawingRef = useRef(hasDrawing);
  const onSceneChange = useCallback(
    (scene: WhiteboardScene) => {
      if (isExpiredNow()) {
        timedScene();
        return;
      }
      updateScene(scene);
      const next = hasSketch(scene.elements);
      if (hasDrawingRef.current !== next) {
        hasDrawingRef.current = next;
        setHasDrawing(next);
      }
    },
    [updateScene, isExpiredNow, timedScene],
  );
  const onBusyChange = useCallback(
    (busy: boolean) => {
      setIsReplying(busy);
      onBusy(busy);
    },
    [onBusy],
  );
  const disabled = isReplying || library.isOpening || starter.isStarting;
  return (
    <main className="flex min-h-dvh flex-col gap-2 p-2 md:h-dvh md:min-h-[36rem]">
      <InterviewSetup
        problems={problems}
        interview={interview}
        hasEnded={hasEnded}
        disabled={disabled}
        choice={starter.choice}
        onChoice={starter.setChoice}
        onStart={() => void starter.start()}
        onNew={() => (hasConfirmedEnd ? onNew() : setLeaveAction("new"))}
        onChangeProblem={() =>
          hasConfirmedEnd ? onChangeProblem() : setLeaveAction("problem")
        }
        isStarting={starter.isStarting}
        error={starter.error}
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
        <InterviewStage phase={phase} ended={hasEnded} />
        {interview?.timing && (
          <InterviewTimer
            remainingSeconds={timer.remainingSeconds}
            ended={hasEnded}
            expired={timer.expired}
            testMode={interview.timing.durationMinutes === 1}
          />
        )}
        <InterviewHistory
          entries={library.entries}
          problems={problems}
          currentId={saved?.id}
          disabled={disabled}
          status={library.status}
          error={library.error}
          onOpen={(id) => void library.open(id)}
          onDelete={(id) => void library.remove(id)}
          onRetrySave={() => void library.save()}
        />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)]">
        <div className="min-h-[32rem] min-w-0 md:min-h-0">
          <Whiteboard
            initialScene={initialScene}
            onChange={onSceneChange}
            onInitialize={(scene) => {
              restoreScene(scene);
              library.initialized(saved?.id);
            }}
            readOnly={
              hasEnded || timer.expired || library.isOpening || library.blocked
            }
          />
        </div>
        <div className="flex min-h-[32rem] min-w-0 md:min-h-0">
          <ChatPanel
            leaveAction={leaveAction}
            onCancelLeave={() => setLeaveAction(undefined)}
            onConfirmLeave={() =>
              leaveAction === "new" ? onNew() : onChangeProblem()
            }
            getScene={timedScene}
            timeExpired={timer.expired}
            canSubmit={canSubmit}
            hasDrawing={hasDrawing}
            interview={interview}
            restored={saved}
            getResumeToken={library.getResumeToken}
            onSave={library.save}
            disabled={library.isOpening || library.blocked}
            onBusyChange={onBusyChange}
            onPhaseChange={setPhase}
            phase={phase}
            hasEnded={hasEnded}
            onEndChange={(ended) => {
              setHasEnded(ended);
              void library.save({ hasEnded: ended });
            }}
            onEndConfirmed={setHasConfirmedEnd}
          />
        </div>
      </div>
    </main>
  );
}
