"use client";
import Link from "next/link";
import { PracticeSkeleton } from "@/components/practice-skeleton";

import { useCallback, useRef, useState, useEffect } from "react";
import type { WhiteboardScene } from "@/lib/whiteboard-snapshot";
import type { ProblemSummary } from "@/lib/interview-selection";
import { useInterviewLibrary } from "@/components/use-interview-library";
import {
  useInterviewStarter,
  type InterviewChoice,
} from "@/components/use-interview-starter";
import { useInterviewNavigation } from "@/components/use-interview-navigation";
import { InterviewSessionWorkspace } from "@/components/interview-session-workspace";
import { PracticeHome } from "@/components/practice-home";
import { InterviewBrief } from "@/components/interview-brief";
import { withMascotTest } from "@/lib/mascot-timing";
import { interviewHref } from "@/lib/interview-navigation";
import { nextInterviewSelection } from "@/lib/interview-restart";

const emptyBoard: WhiteboardScene = {
  elements: [],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {},
};

export function InterviewWorkspace({
  problems,
  view = "interview",
  sessionId,
}: {
  problems: ProblemSummary[];
  view?: "home" | "brief" | "interview" | "results";
  sessionId?: string;
}) {
  const sceneRef = useRef<WhiteboardScene>(emptyBoard);
  const [busy, setBusy] = useState(false);
  const getScene = useCallback(() => sceneRef.current, []);
  const restoreScene = useCallback((scene: WhiteboardScene) => {
    sceneRef.current = scene;
  }, []);
  const library = useInterviewLibrary(getScene, restoreScene, sessionId);
  const starter = useInterviewStarter(
    library.start,
    library.prepareReplacement,
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
  const setChoice = starter.setChoice;
  useEffect(() => {
    if (view !== "brief" || library.opened) return;
    const selected = new URLSearchParams(window.location.search).get("problem");
    if (selected && problems.some((p) => p.problemId === selected))
      setChoice((c) => ({
        ...c,
        problemId: selected,
        durationMinutes: 45,
      }));
  }, [view, library.opened, problems, setChoice]);
  useEffect(() => {
    if (!library.opened) return;
    const href =
      interviewHref(library.opened.id) +
      (library.opened.hasEnded ? "/results" : "");
    if (window.location.pathname !== href)
      window.history.replaceState(
        null,
        "",
        withMascotTest(href, window.location.search),
      );
  }, [library.opened]);
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

  if (!library.ready) return <PracticeSkeleton view={view} />;
  if (view === "home")
    return (
      <PracticeHome
        entries={library.entries}
        problems={problems}
        error={library.error}
        onDelete={library.remove}
      />
    );
  if (view === "brief")
    return <InterviewBrief problems={problems} starter={starter} />;
  if (!library.opened)
    return sessionId ? (
      <main className="p-6">
        <p role="alert">
          {library.error ?? "This interview is not saved in this browser."}
        </p>
        <Link href="/" className="underline">
          Back to home
        </Link>
      </main>
    ) : (
      <InterviewBrief problems={problems} starter={starter} />
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
        void starter.start(nextInterviewSelection(selected), true);
      }}
      onChangeProblem={() => {
        starter.setChoice(selected);
        void library.reset();
      }}
    />
  );
}
