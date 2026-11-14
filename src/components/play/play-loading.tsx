import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlayFrame } from "./play-frame";
import styles from "./play-loading.module.css";
import play from "./play.module.css";

export function PlayLoading({
  title = "Choose your next topic",
}: {
  title?: string;
}) {
  return (
    <section
      className={styles.content}
      role="status"
      aria-busy="true"
      aria-label={`Loading ${title}`}
      data-page-loading
    >
      <h1>{title}</h1>
      <span className="sr-only">Loading your saved progress</span>
      <div className={styles.copy} aria-hidden="true" />
      <div className={styles.cards} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div className={styles.card} key={i} />
        ))}
      </div>
    </section>
  );
}

export function PlayLoadingFrame({
  active = "play",
  title,
}: {
  active?: "play" | "mock" | "progress";
  title?: string;
}) {
  return (
    <PlayFrame active={active}>
      <div className="practice-shell">
        <header className="practice-nav">
          <Brand />
          <ThemeToggle />
        </header>
        <div className={play.modeBar} data-mode-bar>
          <nav aria-label="Practice modes" className={play.links}>
            {(["play", "mock", "progress"] as const).map((mode) => (
              <Link
                key={mode}
                href={`/${mode}`}
                aria-current={mode === active ? "page" : undefined}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </Link>
            ))}
          </nav>
          <div className={styles.hud} aria-label="Loading your progress">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className={play.content}>
          <PlayLoading title={title} />
        </div>
      </div>
    </PlayFrame>
  );
}
