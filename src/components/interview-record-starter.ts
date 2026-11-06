import type { useInterviewAutosave } from "@/components/use-interview-autosave";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import { newSavedInterview, type SavedInterview } from "@/lib/saved-interview";
import type { InterviewStart } from "@/lib/interview-selection";

export function interviewRecordStarter({
  autosave,
  getScene,
  restoreScene,
  onOpened,
  onUnblocked,
  onUrl,
}: {
  autosave: Pick<
    ReturnType<typeof useInterviewAutosave>,
    | "savedRef"
    | "dirtyRef"
    | "conflictedRef"
    | "openingRef"
    | "queueRef"
    | "save"
  >;
  getScene: () => WhiteboardScene;
  restoreScene: (scene: WhiteboardScene) => void;
  onOpened: (saved: SavedInterview) => void;
  onUnblocked: () => void;
  onUrl: (id: string) => void;
}) {
  async function prepareReplacement() {
    if (
      autosave.openingRef.current ||
      autosave.conflictedRef.current ||
      (autosave.savedRef.current && !autosave.savedRef.current.hasEnded)
    )
      return false;
    if (autosave.dirtyRef.current) await autosave.save();
    await autosave.queueRef.current;
    return !autosave.dirtyRef.current && !autosave.conflictedRef.current;
  }
  async function start(interview: InterviewStart, replace = false) {
    const scene: WhiteboardScene = replace
      ? {
          elements: [],
          appState: { viewBackgroundColor: "#ffffff" },
          files: {},
        }
      : getScene();
    restoreScene(scene);
    const saved = newSavedInterview(interview, scene);
    autosave.savedRef.current = saved;
    autosave.conflictedRef.current = false;
    onUnblocked();
    onOpened(saved);
    await autosave.save();
    onUrl(saved.id);
  }
  return { start, prepareReplacement };
}
