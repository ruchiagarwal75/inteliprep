import type { useInterviewAutosave } from "@/components/use-interview-autosave";
import type { InterviewStorage } from "@/lib/interview-storage";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { SavedInterview } from "@/lib/saved-interview";
import { reconnectInterview } from "@/lib/reconnect-interview";

type Navigation = "push" | "replace" | "none";
export async function openInterviewRecord(
  {
    autosave: a,
    storage,
    request,
    getScene,
    restoreScene,
    onOpened,
    onBlocked,
    onError,
    onOpening,
    onUrl,
  }: {
    autosave: Pick<
      ReturnType<typeof useInterviewAutosave>,
      | "savedRef"
      | "revisionsRef"
      | "dirtyRef"
      | "conflictedRef"
      | "openingRef"
      | "queueRef"
      | "save"
    >;
    storage: Pick<InterviewStorage, "readInterview" | "selectInterview">;
    request: typeof fetch;
    getScene: () => WhiteboardScene;
    restoreScene: (scene: WhiteboardScene) => void;
    onOpened: (saved: SavedInterview | undefined) => void;
    onBlocked: (blocked: boolean) => void;
    onError: (error: string | undefined) => void;
    onOpening: (opening: boolean) => void;
    onUrl: (id: string | undefined, navigation: Navigation) => void;
  },
  id: string,
  navigation: Navigation = "push",
) {
  if (a.openingRef.current) return false;
  a.openingRef.current = true;
  onOpening(true);
  try {
    if (a.dirtyRef.current && !a.conflictedRef.current) await a.save();
    await a.queueRef.current;
    if (a.dirtyRef.current && !a.conflictedRef.current)
      throw new Error(
        "Your current interview couldn't be saved. Retry save before opening another interview.",
      );
    const stored = await storage.readInterview(id);
    if (!stored)
      throw new Error("This saved interview is no longer available.");
    const local =
      a.savedRef.current?.id === id &&
      !stored.scorecard &&
      !stored.closedWithoutScoring
        ? a.savedRef.current
        : undefined;
    const copy = local
      ? {
          ...local,
          revision: stored.revision,
          whiteboard: getScene(),
          recoveredMessages: [
            ...new Set([
              ...(stored.recoveredMessages ?? []),
              ...(local.recoveredMessages ?? []),
            ]),
          ],
        }
      : stored;
    onError(undefined);
    await storage.selectInterview(id);
    let restored = copy;
    let reconnectError: string | undefined;
    try {
      restored = await reconnectInterview(copy, request);
    } catch (cause) {
      reconnectError =
        cause instanceof Error
          ? cause.message
          : "Couldn't reconnect to the interviewer. Your browser copy is available.";
    }
    a.savedRef.current = restored;
    a.revisionsRef.current.set(id, stored.revision);
    a.dirtyRef.current = false;
    a.conflictedRef.current = false;
    onBlocked(false);
    restoreScene(restored.whiteboard);
    await a.save();
    onOpened(a.savedRef.current);
    if (reconnectError && !a.dirtyRef.current) onError(reconnectError);
    onUrl(id, navigation);
    return (
      !a.dirtyRef.current &&
      !a.conflictedRef.current &&
      (!copy.transcriptConflict || !reconnectError)
    );
  } catch (cause) {
    onError(
      cause instanceof Error
        ? cause.message
        : "Couldn't open the saved interview.",
    );
    onUrl(a.savedRef.current?.id, "replace");
    return false;
  } finally {
    a.openingRef.current = false;
    onOpening(false);
  }
}
