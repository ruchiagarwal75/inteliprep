"use client";

import { useCallback, useRef, useState } from "react";
import { LaptopNote } from "@/components/laptop-note";
import { useWrapUpDeadline } from "@/components/use-wrap-up-deadline";
import { hasLabeledShape } from "@/lib/labeled-drawing";
import { ChatPanel } from "@/components/chat-panel";
import { Whiteboard } from "@/components/whiteboard";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";

import type { ProblemSummary } from "@/lib/interview-selection";

import type { InterviewPhase } from "@/lib/interview-phase";
import { InterviewLiveHeader } from "@/components/interview-live-header";
import type { useInterviewLibrary } from "@/components/use-interview-library";
import type { useInterviewStarter } from "@/components/use-interview-starter";

import type { SavedInterview } from "@/lib/saved-interview";
import { useInterviewTimer } from "@/components/use-interview-timer";
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
  const [, setHasConfirmedEnd] = useState(saved?.hasEnded ?? false);
  const [leaveAction] = useState<"new" | "problem">();
  const [endTarget, setEndTarget] = useState<HTMLDivElement | null>(null);
  const [activePanel, setActivePanel] = useState<"board" | "chat">("chat");
  const [unread, setUnread] = useState(false);
  const activePanelRef = useRef(activePanel);
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
    hasLabeledShape(initialScene.elements),
  );
  const hasDrawingRef = useRef(hasDrawing);
  const onSceneChange = useCallback(
    (scene: WhiteboardScene) => {
      if (isExpiredNow()) {
        timedScene();
        return;
      }
      updateScene(scene);
      const next = hasLabeledShape(scene.elements);
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
  void starter;
  useWrapUpDeadline(
    interview,
    timer.remainingSeconds,
    hasEnded || isReplying,
    library.getResumeToken,
    setPhase,
    library.save,
  );
  return (
    <main
      className={[
        "interview-page flex h-dvh min-h-0 flex-col gap-2 overflow-hidden p-2",
        hasEnded ? "mascot-results-page" : "",
      ].join(" ")}
    >
      <InterviewLiveHeader
        title={
          problems.find((p) => p.problemId === interview?.problemId)?.title
        }
        interview={interview}
        phase={phase}
        ended={hasEnded}
        remainingSeconds={timer.remainingSeconds}
        expired={timer.expired}
        status={library.status}
        error={library.error}
        setEndTarget={setEndTarget}
        save={library.save}
      />
      {library.error && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {library.error}
          <button
            className="ml-2 underline"
            onClick={() => void library.save()}
          >
            Retry save
          </button>
        </p>
      )}
      {!hasEnded && (
        <div
          className="flex shrink-0 gap-2 min-[900px]:hidden"
          role="tablist"
          aria-label="Interview panels"
        >
          {(["board", "chat"] as const).map((panel) => (
            <button
              key={panel}
              role="tab"
              aria-selected={activePanel === panel}
              aria-controls={`panel-${panel}`}
              id={`tab-${panel}`}
              onClick={() => {
                activePanelRef.current = panel;
                setActivePanel(panel);
                if (panel === "chat") setUnread(false);
              }}
              className="rounded border px-4 py-2 text-sm"
            >
              {panel === "board" ? "Board" : `Chat${unread ? " ●" : ""}`}
            </button>
          ))}
        </div>
      )}
      <LaptopNote />
      <div
        className={`grid min-h-0 flex-1 gap-2 ${hasEnded ? "grid-cols-1" : "min-[900px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"}`}
      >
        <div
          id="panel-board"
          role="tabpanel"
          aria-labelledby="tab-board"
          className={`min-h-0 min-w-0 ${hasEnded ? "hidden" : activePanel === "board" ? "block" : "hidden min-[900px]:block"}`}
        >
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
        <div
          id="panel-chat"
          role="tabpanel"
          aria-labelledby="tab-chat"
          className={`min-h-0 min-w-0 ${hasEnded || activePanel === "chat" ? "flex" : "hidden min-[900px]:flex"}`}
        >
          <ChatPanel
            leaveAction={leaveAction}
            onCancelLeave={() => {}}
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
            onCloseWithoutScoring={library.closeWithoutScoring}
            onLoadLatest={library.loadLatest}
            storageConflict={library.blocked}
            disabled={library.isOpening || library.blocked}
            onBusyChange={onBusyChange}
            onPhaseChange={setPhase}
            phase={phase}
            hasEnded={hasEnded}
            endControlTarget={endTarget}
            brief={
              problems.find((p) => p.problemId === interview?.problemId)
                ?.brief?.[interview?.level ?? "mid"]
            }
            onAssistantMessage={() => {
              if (activePanelRef.current === "board") setUnread(true);
            }}
            onEndChange={(ended) => {
              setHasEnded(ended);
              void library.save({ hasEnded: ended });
            }}
            onEndConfirmed={(ended) => {
              setHasConfirmedEnd(ended);
              if (ended && interview)
                window.history.replaceState(
                  null,
                  "",
                  `/interview/${interview.sessionId}/results`,
                );
            }}
          />
        </div>
      </div>
    </main>
  );
}
