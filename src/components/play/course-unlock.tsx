"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { GameGuide } from "./game-guide";
import styles from "./course-unlock.module.css";

/** Cosmetic only. The server supplies armed after checking the primer pass. */
export function CourseUnlock({
  armed,
  children,
}: {
  armed: boolean;
  children: ReactNode;
}) {
  const { userId } = useCandidateAccount();
  const [visible, setVisible] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const showing = useRef(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const center = (selector: string) =>
      scene.current?.querySelector(selector)?.scrollIntoView({
        block: "center",
        behavior: reduced ? "instant" : "smooth",
      });
    const centerCurrent = () => {
      let active = true;
      const align = () => {
        if (active) center('[aria-current="step"] [data-course-node]');
      };
      const frame = requestAnimationFrame(() => {
        align();
        for (const animation of scene.current
          ?.querySelector('[aria-current="step"] [data-course-node]')
          ?.getAnimations() ?? [])
          void animation.finished.then(align, () => {});
      });
      void document.fonts.ready.then(align);
      return () => {
        active = false;
        cancelAnimationFrame(frame);
      };
    };
    if (!armed) return centerCurrent();
    const key = `mockmeai:primer-unlocked:${userId}`;
    try {
      if (localStorage.getItem(key)) return centerCurrent();
    } catch {}
    const frame = requestAnimationFrame(() => {
      try {
        localStorage.setItem(key, "1");
      } catch {}
      showing.current = true;
      setVisible(true);
      if (reduced) center('[data-topic-level="1"] [data-course-node]');
    });
    const pan = window.setTimeout(() => {
      if (showing.current && !reduced)
        center('[data-topic-level="1"] [data-course-node]');
    }, 700);
    const end = window.setTimeout(() => {
      showing.current = false;
      setVisible(false);
    }, 6500);
    return () => {
      showing.current = false;
      cancelAnimationFrame(frame);
      clearTimeout(pan);
      clearTimeout(end);
    };
  }, [armed, userId]);
  const dismiss = () => {
    showing.current = false;
    setVisible(false);
  };
  return (
    <div
      ref={scene}
      className={styles.scene}
      data-unlocking={visible || undefined}
    >
      {visible && (
        <section
          className={styles.notice}
          role="status"
          aria-label="World unlocked"
        >
          <h2 data-game-label>World unlocked</h2>
          <p>9 topics open up. Next: Ingestion and chunking.</p>
          <GameGuide
            size="small"
            pose="cheer"
            message="Let's go deeper"
            bubble="speech"
          />
          <div className={styles.actions}>
            <Link className="practice-primary" href="/play/rag/topics/1">
              Start Topic 1
            </Link>
            <button type="button" className="practice-link" onClick={dismiss}>
              Later
            </button>
          </div>
        </section>
      )}
      {children}
    </div>
  );
}
