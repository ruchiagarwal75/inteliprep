"use client";

import dynamic from "next/dynamic";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

export type WhiteboardScene = {
  elements: readonly ExcalidrawElement[];
  appState: Pick<AppState, "viewBackgroundColor">;
  files: BinaryFiles;
};

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
};

export function Whiteboard({ onChange }: WhiteboardProps) {
  return (
    <section
      aria-label="Whiteboard"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/15"
    >
      <header className="border-b border-black/10 px-3 py-2 dark:border-white/15">
        <h2 className="text-sm font-medium">Whiteboard</h2>
      </header>
      <div className="min-h-0 flex-1">
        <Excalidraw
          onChange={(elements, appState, files) => {
            onChange({
              elements,
              // Keep serializable drawing settings, not transient editor state.
              appState: { viewBackgroundColor: appState.viewBackgroundColor },
              files,
            });
          }}
        />
      </div>
    </section>
  );
}
