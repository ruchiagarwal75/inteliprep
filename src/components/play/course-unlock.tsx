"use client";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  const previouslyVisible = useRef(false);
  useLayoutEffect(() => {
    if (visible) {
      scene.current
        ?.querySelector('[aria-label="World unlocked"]')
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    } else if (previouslyVisible.current) {
      scene.current
        ?.querySelector('[data-topic-level="1"] [data-course-node]')
        ?.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    }
    previouslyVisible.current = visible;
  }, [visible]);
  useEffect(() => {
    const center = (selector: string) =>
      scene.current?.querySelector(selector)?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    const centerCurrent = () => {
      let active = true;
      const align = () => {
        const current = '[aria-current="step"] [data-course-node]';
        if (active)
          center(
            window.location.hash === "#rag-boss" ||
              !scene.current?.querySelector(current)
              ? "#rag-boss"
              : current,
          );
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
      setVisible(true);
    });
    const end = window.setTimeout(() => {
      setVisible(false);
    }, 6500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(end);
    };
  }, [armed, userId]);
  const dismiss = () => {
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
