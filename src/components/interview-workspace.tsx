"use client";

import { useCallback, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { Whiteboard } from "@/components/whiteboard";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import { InterviewSetup } from "@/components/interview-setup";
import type { InterviewStart, ProblemSummary } from "@/lib/interview-selection";
import { hasSketch } from "@/lib/drawing-state";
import type { InterviewPhase } from "@/lib/interview-phase";
import { InterviewStage } from "@/components/interview-stage";

export function InterviewWorkspace({
  problems,
}: {
  problems: ProblemSummary[];
}) {
  const [interview, setInterview] = useState<InterviewStart>();
  const [phase, setPhase] = useState<InterviewPhase>();
  const [isReplying, setIsReplying] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const hasDrawingRef = useRef(false);
  // Drawing updates must not re-render the chat on every pointer movement.
  const sceneRef = useRef<WhiteboardScene>({
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  });

  const updateScene = useCallback((scene: WhiteboardScene) => {
    sceneRef.current = scene;
    const nextHasDrawing = hasSketch(scene.elements);
    if (nextHasDrawing !== hasDrawingRef.current) {
      hasDrawingRef.current = nextHasDrawing;
      setHasDrawing(nextHasDrawing);
    }
  }, []);

  const getScene = useCallback(() => sceneRef.current, []);

  return (
    <main className="flex min-h-dvh flex-col gap-3 p-3 lg:h-dvh lg:min-h-0">
      <InterviewSetup
        problems={problems}
        interview={interview}
        isReplying={isReplying}
        onStart={(started) => {
          setInterview(started);
          setPhase(started.phase);
        }}
        onReset={() => {
          setInterview(undefined);
          setPhase(undefined);
        }}
      />
      <InterviewStage phase={phase} />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
        <div className="min-h-[28rem] min-w-0 lg:min-h-0">
          <Whiteboard onChange={updateScene} />
        </div>
        <div className="flex min-h-80 min-w-0 lg:min-h-0">
          <ChatPanel
            key={interview ? interview.sessionId : "setup"}
            getScene={getScene}
            hasDrawing={hasDrawing}
            interview={interview}
            onBusyChange={setIsReplying}
            onPhaseChange={setPhase}
          />
        </div>
      </div>
    </main>
  );
}
