"use client";

import { useCallback, useRef } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { Whiteboard, type WhiteboardScene } from "@/components/whiteboard";

export function InterviewWorkspace() {
  // Drawing updates must not re-render the chat on every pointer movement.
  const sceneRef = useRef<WhiteboardScene>({
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  });

  const updateScene = useCallback((scene: WhiteboardScene) => {
    sceneRef.current = scene;
  }, []);

  const getScene = useCallback(() => sceneRef.current, []);

  return (
    <main className="grid min-h-dvh grid-cols-1 gap-3 p-3 lg:h-dvh lg:min-h-0 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
      <div className="min-h-[28rem] min-w-0 lg:min-h-0">
        <Whiteboard onChange={updateScene} />
      </div>
      <div className="flex min-h-80 min-w-0 lg:min-h-0">
        <ChatPanel getScene={getScene} />
      </div>
    </main>
  );
}
