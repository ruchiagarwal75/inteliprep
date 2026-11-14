"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";
import {
  RAG_COURSE_ID,
  RAG_COURSE_NODES,
  courseTopicHref,
} from "@/lib/play/course/metadata";
import {
  courseLevelOpen,
  nextCourseLevel,
  primerOptional,
} from "@/lib/play/course/path-access";
import type { RagBossState } from "@/lib/rag-boss-public";
import type { CoursePath } from "./course-path";
import { BossGate } from "./boss-gate";
import { ChestNode } from "./chest-node";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import { Stars } from "./stars";
import styles from "./course-map.module.css";

type CourseNode = (typeof RAG_COURSE_NODES)[number];
const labels = {
  0: "RAG basics",
  1: "Ingestion & chunks",
  2: "Embeddings",
  3: "Retrieval",
  4: "Re-ranking",
  5: "Context & prompts",
  6: "Generation",
  7: "Evaluation",
  8: "Scale & freshness",
  9: "Failure & safety",
} satisfies Record<CourseNode["level"], string>;

function position(index: number) {
  const row = Math.floor(index / 3);
  return {
    gridRow: row + 1,
    gridColumn: row % 2 ? 3 - (index % 3) : (index % 3) + 1,
  };
}

export function CourseMap({
  passed,
  stars,
  chests,
  started = [],
  preserveTopicOne = false,
  bossState,
}: ComponentProps<typeof CoursePath> & { bossState: RagBossState["state"] }) {
  const access = preserveTopicOne ? [...started, 1] : started;
  const current = nextCourseLevel(passed, access);
  const [selected, setSelected] = useState<CourseNode>(
    current ?? RAG_COURSE_NODES[9],
  );
  const complete = passed.includes(selected.level);
  const open = courseLevelOpen(selected.level, passed, access);
  return (
    <section className={styles.overview} aria-label="RAG learning map">
      <p className={styles.hint}>Choose a topic to see its details.</p>
      <div className={styles.canvas} data-course-map tabIndex={-1}>
        <svg
          className={styles.track}
          viewBox="0 0 300 360"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M50 28H250V118H50V208H250V298H150" />
          <path
            d="M50 28H150"
            data-primer-connector
            className={styles.primerConnector}
          />
        </svg>
        <ol className={styles.stops} aria-label="RAG course map stops">
          {RAG_COURSE_NODES.map((node, index) => {
            const done = passed.includes(node.level);
            const available = courseLevelOpen(node.level, passed, access);
            const state = done
              ? "passed"
              : current?.level === node.level
                ? "current"
                : available
                  ? "open"
                  : "locked";
            return (
              <li
                key={node.level}
                style={position(index)}
                data-map-topic={node.level}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
              >
                <button
                  type="button"
                  className={styles.stop}
                  aria-pressed={selected.level === node.level}
                  aria-controls="course-map-selection"
                  aria-label={`Topic ${node.level}: ${node.title}, ${state}`}
                  onClick={() => setSelected(node)}
                >
                  <span className={styles.marker} aria-hidden="true">
                    {done ? (
                      <PixelSprite
                        art={PIXEL_ART.check}
                        width={24}
                        height={18}
                      />
                    ) : !available ? (
                      <PixelSprite
                        art={PIXEL_ART.lock}
                        width={20}
                        height={20}
                      />
                    ) : (
                      node.level
                    )}
                  </span>
                  <span className={styles.label}>{labels[node.level]}</span>
                </button>
              </li>
            );
          })}
          <li
            style={position(10)}
            data-map-boss
            data-state={bossState}
            aria-current={!current ? "step" : undefined}
          >
            <Link
              className={styles.stop}
              href="#rag-boss"
              aria-label="Final boss: mock interview details"
            >
              <span className={styles.bossMarker} aria-hidden="true">
                <BossGate scale={1} open={bossState === "defeated"} />
              </span>
              <span className={styles.label}>Final boss</span>
            </Link>
          </li>
        </ol>
      </div>
      <section
        id="course-map-selection"
        className={styles.selection}
        aria-live="polite"
        aria-labelledby="course-map-topic-title"
      >
        <div className={styles.topicDetails}>
          <span className={styles.topicNumber}>
            Topic {selected.level}
            {current?.level === selected.level
              ? " · Up next"
              : complete
                ? " · Cleared"
                : ""}
          </span>
          <h2 id="course-map-topic-title">{selected.title}</h2>
          <p>
            About {selected.minutes} min
            {selected.level === 0 && primerOptional(passed, access)
              ? " · Optional"
              : ""}
          </p>
          {complete && <Stars count={stars[selected.level] ?? 0} />}
          {open ? (
            <div className={styles.actions}>
              <Link
                className="practice-primary"
                href={courseTopicHref(selected.level)}
              >
                {complete ? "Practice again" : "Learn"}
              </Link>
              {(complete || started.includes(selected.level)) && (
                <Link
                  className="practice-secondary"
                  href={courseTopicHref(selected.level)}
                >
                  Review slides
                </Link>
              )}
            </div>
          ) : (
            <p>Pass Topic {selected.level - 1} to unlock.</p>
          )}
        </div>
        {[3, 6, 9].includes(selected.level) && (
          <ChestNode
            key={selected.level}
            topic={RAG_COURSE_ID}
            afterLevel={selected.level}
            unlocked={complete}
            openedXp={chests[selected.level]}
          />
        )}
      </section>
    </section>
  );
}
