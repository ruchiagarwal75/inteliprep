"use client";
import type { ComponentProps } from "react";
import type { courseProgress } from "@/lib/play/course/progress";
import Link from "next/link";
import { RAG_COURSE_ID } from "@/lib/play/course/metadata";
import { WorldBanner } from "./world-banner";
import { CourseUnlock } from "./course-unlock";
import { CoursePath } from "./course-path";
import { StartRound } from "./start-round";
import { BossNode } from "./boss-node";
import { BossCleared } from "./boss-cleared";
import type { RagBossState } from "@/lib/rag-boss-public";
import { CourseMap } from "./course-map";
import mapStyles from "./course-map.module.css";

export function CourseWorldView({
  progress,
  pathProps,
  reviews,
  boss,
  primerUnlock,
  view,
}: {
  progress: ReturnType<typeof courseProgress>;
  pathProps: ComponentProps<typeof CoursePath>;
  reviews: number;
  boss: RagBossState;
  primerUnlock: boolean;
  view: "map" | "path";
}) {
  return (
    <>
      <Link className="practice-link" href="/play">
        All worlds
      </Link>
      <WorldBanner title="RAG" unit="topics" {...progress} />
      <p>All 10 RAG topics are open in this beta.</p>
      <Link className="practice-secondary" href="/play/rag/notebook">
        Notebook
      </Link>
      {reviews > 0 && (
        <section className="practice-surface">
          <h2>Review</h2>
          <p>{reviews} questions are due.</p>
          <StartRound
            topic={RAG_COURSE_ID}
            mode="review"
            label="Start review"
          />
        </section>
      )}
      <nav className={mapStyles.views} aria-label="Learning path view">
        <Link
          href="/play/rag?view=map"
          aria-current={view === "map" ? "page" : undefined}
        >
          Map overview
        </Link>
        <Link
          href="/play/rag?view=path"
          aria-current={view === "path" ? "page" : undefined}
        >
          Detailed path
        </Link>
      </nav>
      <CourseUnlock armed={primerUnlock} view={view}>
        {view === "map" ? (
          <CourseMap {...pathProps} bossState={boss.state} />
        ) : (
          <CoursePath {...pathProps} />
        )}
        {boss.state === "defeated" && (
          <BossCleared
            armed={!boss.worldClearedSeenAt}
            sessionId={boss.result.sessionId}
          />
        )}
        <BossNode boss={boss} />
      </CourseUnlock>
    </>
  );
}
