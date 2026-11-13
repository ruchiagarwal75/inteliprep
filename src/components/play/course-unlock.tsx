"use client";
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
    const centerCurrent = () => {
      let active = true;
      const align = () => {
        if (!active) return;
        scene.current
          ?.querySelector('[aria-current="step"] [data-course-node]')
          ?.scrollIntoView({
            block: "center",
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
      };
      const frame = requestAnimationFrame(() => {
        align();
        // The current node's arrival animation moves it by 4px. Recenter once
        // it settles, rather than capturing a temporary transformed position.
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
    });
    const pan = window.setTimeout(() => {
      if (
        showing.current &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        scene.current
          ?.querySelector('[data-topic-level="1"]')
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 2400);
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
          <div>
            <h2 data-game-label>World unlocked</h2>
            <GameGuide size="small" pose="cheer" message="Let's go deeper" />
          </div>
          <button
            type="button"
            className="practice-secondary"
            onClick={() => {
              showing.current = false;
              setVisible(false);
            }}
          >
            Keep going
          </button>
        </section>
      )}
      {children}
    </div>
  );
}
