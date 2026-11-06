"use client";
import Link from "next/link";
import type { ProblemSummary } from "@/lib/interview-selection";
import type { useInterviewStarter } from "@/components/use-interview-starter";
import { InterviewSetup } from "@/components/interview-setup";
import { useEffect, useRef } from "react";
export function InterviewBrief({
  problems,
  starter,
}: {
  problems: ProblemSummary[];
  starter: ReturnType<typeof useInterviewStarter>;
}) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  const hasError = Boolean(starter.error);
  useEffect(() => {
    if (hasError) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [hasError]);
  const selected = problems.find(
    (p) => p.problemId === starter.choice.problemId,
  );
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
      <Link className="underline" href="/">
        Back to home
      </Link>
      <h1 className="text-2xl font-semibold">Your practice brief</h1>
      <InterviewSetup
        problems={problems}
        hasEnded={false}
        disabled={false}
        choice={starter.choice}
        onChoice={starter.setChoice}
        onStart={() => void starter.start()}
        onNew={() => {}}
        onChangeProblem={() => {}}
        isStarting={starter.isStarting}
        hideStart
      />
      <section aria-label="Problem brief" className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">{selected?.title}</h2>
        <p className="whitespace-pre-wrap">
          {selected?.brief?.[starter.choice.level] ?? selected?.summary}
        </p>
      </section>
      <section>
        <h2 className="font-semibold">The five stages</h2>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Clarify requirements</li>
          <li>Draw and explain</li>
          <li>Core design</li>
          <li>Scaling and reliability</li>
          <li>Tradeoffs and wrap-up</li>
        </ol>
      </section>
      <ul className="list-inside list-disc space-y-2">
        <li>
          Draw your components and connections. Questions pause while you draw.
        </li>
        <li>
          Choose Ready to explain, then describe your design in chat. The
          interviewer listens.
        </li>
        <li>
          Choose Done explaining to open discussion. You can pause to draw
          again.
        </li>
      </ul>
      <p className="text-sm">
        The timer starts when you press Start interview. Only your latest
        attempt for each problem appears in history, across difficulties and
        durations.
      </p>
      <button
        disabled={starter.isStarting || starter.isLimited}
        aria-describedby={starter.error ? "start-error" : undefined}
        className="bg-foreground text-background rounded px-5 py-3 disabled:opacity-40"
        onClick={() => void starter.start()}
      >
        {starter.isStarting ? "Starting…" : "Start interview"}
      </button>
      {starter.error && (
        <p
          id="start-error"
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded border border-red-400 bg-red-50 p-3 font-medium text-red-900 dark:bg-red-950 dark:text-red-100"
        >
          {starter.error}
        </p>
      )}
    </main>
  );
}
