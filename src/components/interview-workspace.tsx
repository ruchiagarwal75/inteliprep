"use client";

import { useCallback, useRef, useState } from "react";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { ProblemSummary } from "@/lib/interview-selection";
import { useInterviewLibrary } from "@/components/use-interview-library";
import {
  useInterviewStarter,
  type InterviewChoice,
} from "@/components/use-interview-starter";
import { useInterviewNavigation } from "@/components/use-interview-navigation";
import { InterviewSessionWorkspace } from "@/components/interview-session-workspace";

const emptyBoard: WhiteboardScene = {
  elements: [],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {},
};

export function InterviewWorkspace({
  problems,
}: {
  problems: ProblemSummary[];
}) {
  const sceneRef = useRef<WhiteboardScene>(emptyBoard);
  const [busy, setBusy] = useState(false);
  const getScene = useCallback(() => sceneRef.current, []);
  const restoreScene = useCallback((scene: WhiteboardScene) => {
    sceneRef.current = scene;
  }, []);
  const library = useInterviewLibrary(getScene, restoreScene);
  const starter = useInterviewStarter(
    library.start,
    () => library.reset(false, "none"),
    {
      problemId: problems[0]?.problemId ?? "single-server-scaling",
      level: "mid",
      durationMinutes: 45,
    },
  );
  useInterviewNavigation({
    ready: library.ready,
    busy: busy || starter.isStarting || library.isOpening,
    open: library.open,
    reset: library.reset,
  });
  const changed = library.changed;
  const updateScene = useCallback(
    (scene: WhiteboardScene) => {
      sceneRef.current = scene;
      changed();
    },
    [changed],
  );
  const selected: InterviewChoice = library.opened
    ? {
        problemId: library.opened.interview.problemId,
        level: library.opened.interview.level,
        durationMinutes: library.opened.interview.timing?.durationMinutes ?? 45,
      }
    : starter.choice;

  if (!library.ready)
    return (
      <main className="p-6" role="status">
        Loading saved interviews…
      </main>
    );
  return (
    <InterviewSessionWorkspace
      key={library.opened?.revision ?? "setup"}
      saved={library.opened}
      initialScene={library.opened?.whiteboard ?? emptyBoard}
      problems={problems}
      library={library}
      getScene={getScene}
      restoreScene={restoreScene}
      updateScene={updateScene}
      starter={starter}
      onBusy={setBusy}
      onNew={() => {
        void starter.start(selected, true);
      }}
      onChangeProblem={() => {
        starter.setChoice(selected);
        void library.reset();
      }}
    />
  );
}
