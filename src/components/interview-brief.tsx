"use client";
import Link from "next/link";
import type { ProblemSummary } from "@/lib/interview-selection";
import type { useInterviewStarter } from "@/components/use-interview-starter";
import { InterviewSetup } from "@/components/interview-setup";
export function InterviewBrief({
  problems,
  starter,
}: {
  problems: ProblemSummary[];
  starter: ReturnType<typeof useInterviewStarter>;
}) {
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
        error={starter.error}
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
        The timer starts when you press Start interview.
      </p>
      <button
        disabled={starter.isStarting}
        className="bg-foreground text-background rounded px-5 py-3 disabled:opacity-40"
        onClick={() => void starter.start()}
      >
        {starter.isStarting ? "Starting…" : "Start interview"}
      </button>
    </main>
  );
}
