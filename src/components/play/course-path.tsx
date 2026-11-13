import {
  courseLevelOpen,
  nextCourseLevel,
  primerOptional,
} from "@/lib/play/course/path-access";
import Link from "next/link";
import {
  RAG_COURSE_ID,
  RAG_COURSE_NODES,
  courseTopicHref,
} from "@/lib/play/course/metadata";
import { Stars } from "./stars";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import { GameGuide } from "./game-guide";
import { ChestNode } from "./chest-node";
import styles from "./level-path.module.css";

export function CoursePath({
  passed,
  stars,
  chests,
  started = [],
  preserveTopicOne = false,
}: {
  passed: number[];
  stars: Record<number, number>;
  chests: Record<number, number>;
  started?: number[];
  preserveTopicOne?: boolean;
}) {
  const access = preserveTopicOne ? [...started, 1] : started;
  const currentLevel = nextCourseLevel(passed, access)?.level;
  const track = (mobile: boolean, segments = RAG_COURSE_NODES.length - 1) => {
    const x = (i: number) =>
      i % 2 ? (mobile ? 360 : 450) : mobile ? 240 : 150;
    return (
      `M ${x(0)} 120` +
      RAG_COURSE_NODES.slice(1, segments + 1)
        .map(
          (_, i) =>
            ` V ${i * 440 + 364} H ${x(i + 1)} V ${(i + 1) * 440 + 120}`,
        )
        .join("")
    );
  };
  return (
    <div className={styles.world}>
      {[false, true].map((mobile) => (
        <svg
          key={String(mobile)}
          className={`${styles.track} ${mobile ? styles.mobileTrack : styles.desktopTrack}`}
          viewBox={`0 0 600 ${RAG_COURSE_NODES.length * 440}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={track(mobile)} />
          <path
            d={track(mobile, 1)}
            data-primer-connector
            className={styles.primerConnector}
          />
        </svg>
      ))}
      <ol className={styles.path} aria-label="RAG course topics">
        {RAG_COURSE_NODES.map((node, index) => {
          const complete = passed.includes(node.level),
            open = courseLevelOpen(node.level, passed, access);
          const state = complete
            ? "passed"
            : open && node.level === currentLevel
              ? "current"
              : open
                ? "open"
                : "locked";
          return (
            <li
              key={node.level}
              className={styles.step}
              data-state={state}
              data-topic-level={node.level}
              data-side={index % 2}
              aria-current={state === "current" ? "step" : undefined}
            >
              {open && (complete || started.includes(node.level)) ? (
                <details
                  className={styles.reviewPopover}
                  data-topic-review={node.level}
                >
                  <summary
                    className={styles.node}
                    data-course-node
                    aria-label={`Topic ${node.level}: ${node.title}`}
                  >
                    {complete ? (
                      <PixelSprite
                        art={PIXEL_ART.check}
                        width="32"
                        height="24"
                      />
                    ) : (
                      <span data-game-label>{node.level}</span>
                    )}
                  </summary>
                  <div className={styles.reviewMenu}>
                    <strong>{node.title}</strong>
                    <Link
                      className="practice-secondary"
                      href={courseTopicHref(node.level)}
                    >
                      Review slides
                    </Link>
                  </div>
                </details>
              ) : open ? (
                <Link
                  className={styles.node}
                  data-course-node
                  href={courseTopicHref(node.level)}
                  aria-label={`Topic ${node.level}: ${node.title}`}
                >
                  {complete ? (
                    <PixelSprite art={PIXEL_ART.check} width="32" height="24" />
                  ) : (
                    <span data-game-label>{node.level}</span>
                  )}
                </Link>
              ) : (
                <div
                  className={styles.node}
                  data-course-node
                  aria-disabled="true"
                  aria-label={`Topic ${node.level}: ${node.title}, ${node.available ? "locked" : "coming soon"}`}
                >
                  <PixelSprite art={PIXEL_ART.lock} width="32" height="32" />
                </div>
              )}
              <div className={styles.caption}>
                <span data-game-label>
                  {node.available ? `Topic ${node.level}` : "Soon"}
                </span>
                <strong>{node.title}</strong>
                {"minutes" in node && (
                  <span>
                    About {node.minutes} min
                    {node.level === 0 && primerOptional(passed, access)
                      ? " · Optional"
                      : ""}
                  </span>
                )}
                {complete && <Stars count={stars[node.level] ?? 0} />}
                {open && (
                  <Link
                    className={
                      state === "current"
                        ? "practice-primary"
                        : "practice-secondary"
                    }
                    href={courseTopicHref(node.level)}
                  >
                    {complete ? "Practice again" : "Learn"}
                  </Link>
                )}
                {!open && node.available && (
                  <span>Pass Topic {node.level - 1} to unlock.</span>
                )}
              </div>
              {state === "current" && (
                <div className={styles.guide}>
                  <GameGuide
                    size="large"
                    message={`Ready for Topic ${node.level}?`}
                  />
                </div>
              )}
              {[3, 6, 9].includes(node.level) && (
                <div className={styles.chest}>
                  <ChestNode
                    topic={RAG_COURSE_ID}
                    afterLevel={node.level}
                    unlocked={complete}
                    openedXp={chests[node.level]}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
