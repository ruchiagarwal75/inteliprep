"use client";

import { configureWhiteboardAssets } from "@/lib/whiteboard-assets";
import dynamic from "next/dynamic";
import { useRef } from "react";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => {
    configureWhiteboardAssets();
    return import("@excalidraw/excalidraw").then((module) => module.Excalidraw);
  },
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="flex h-full items-center justify-center text-sm text-black/50 dark:text-white/50"
      >
        Loading whiteboard…
      </div>
    ),
  },
);

type WhiteboardProps = {
  onChange: (scene: WhiteboardScene) => void;
  onInitialize: (scene: WhiteboardScene) => void;
  readOnly?: boolean;
  initialScene?: WhiteboardScene;
};

export function Whiteboard({
  onChange,
  onInitialize,
  readOnly = false,
  initialScene,
}: WhiteboardProps) {
  const initialized = useRef(false);
  return (
    <section
      aria-label="Whiteboard"
      data-read-only={readOnly}
      className="whiteboard-panel paper-card flex h-full min-h-0 flex-col overflow-hidden"
    >
      <header className="whiteboard-heading">
        <h2 className="text-sm font-medium">
          {readOnly ? "Final whiteboard" : "Whiteboard"}
        </h2>
      </header>
      <div className="min-h-0 flex-1">
        <Excalidraw
          theme="light"
          UIOptions={{
            canvasActions: {
              toggleTheme: false,
              changeViewBackgroundColor: false,
              loadScene: false,
              saveToActiveFile: false,
            },
          }}
          initialData={{
            ...initialScene,
            appState: {
              ...initialScene?.appState,
              viewBackgroundColor:
                !initialScene?.appState.viewBackgroundColor ||
                /^#(?:fff|ffffff)$/iu.test(
                  initialScene.appState.viewBackgroundColor,
                )
                  ? "#f4f1ea"
                  : initialScene.appState.viewBackgroundColor,
            },
            scrollToContent:
              Boolean(
                initialScene?.elements.some((element) => !element.isDeleted),
              ) &&
              (readOnly || !initialScene?.appState.zoom),
          }}
          viewModeEnabled={readOnly}
          onChange={(elements, appState, files) => {
            if (readOnly && initialized.current) return;
            const scene = {
              elements,
              // Keep serializable drawing settings, not transient editor state.
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                scrollX: appState.scrollX,
                scrollY: appState.scrollY,
                zoom: appState.zoom,
              },
              files,
            };
            // Excalidraw normalizes initial data before its first callback.
            if (!initialized.current) {
              initialized.current = true;
              onInitialize(scene);
            } else onChange(scene);
          }}
        />
      </div>
    </section>
  );
}
