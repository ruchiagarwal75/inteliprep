"use client";

import { configureWhiteboardAssets } from "@/lib/whiteboard-assets";
import dynamic from "next/dynamic";
import { useRef, useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";
import { themeColor } from "@/lib/theme-colors";
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
        className="text-muted flex h-full items-center justify-center text-sm"
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

const subscribePalette = () => () => {};
const canvasColor = () => themeColor("--canvas-background");
const serverColor = () => undefined;

export function Whiteboard({
  onChange,
  onInitialize,
  readOnly = false,
  initialScene,
}: WhiteboardProps) {
  const initialized = useRef(false);
  const savedBackground = useRef(initialScene?.appState.viewBackgroundColor);
  const { theme } = useTheme();
  const background = useSyncExternalStore(
    subscribePalette,
    canvasColor,
    serverColor,
  );
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
        {background && (
          <Excalidraw
            theme={theme}
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
                // Excalidraw applies its native dark filter to the white canvas.
                viewBackgroundColor: background,
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
                  // Display theme changes must not change saved drawing content.
                  viewBackgroundColor: savedBackground.current || background,
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
        )}
      </div>
    </section>
  );
}
