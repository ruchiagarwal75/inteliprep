"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((module) => module.Excalidraw),
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
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const [stylesOpen, setStylesOpen] = useState(false);
  return (
    <section
      aria-label="Whiteboard"
      data-styles-open={stylesOpen && !readOnly}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/15"
    >
      <header className="flex items-center justify-between border-b border-black/10 px-3 py-2 dark:border-white/15">
        <h2 className="text-sm font-medium">
          {readOnly ? "Final whiteboard" : "Whiteboard"}
        </h2>
        {!readOnly && (
          <button
            type="button"
            aria-expanded={stylesOpen}
            onClick={() => {
              const open = !stylesOpen;
              setStylesOpen(open);
              api.current?.updateScene({
                appState: { openMenu: open ? "shape" : null },
              });
            }}
            className="rounded border border-black/20 px-2 py-1 text-xs dark:border-white/25"
          >
            {stylesOpen ? "Hide styles" : "Styles"}
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1">
        <Excalidraw
          excalidrawAPI={(instance) => {
            api.current = instance;
          }}
          initialData={
            initialScene
              ? {
                  ...initialScene,
                  scrollToContent: !initialScene.appState.zoom,
                }
              : undefined
          }
          viewModeEnabled={readOnly}
          onChange={(elements, appState, files) => {
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
            // Excalidraw restores and migrates initial data before its first callback.
            // That normalized snapshot is the baseline, not a candidate edit.
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
