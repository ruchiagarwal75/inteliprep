"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Keep scroll boundaries inside the modal and show hidden history explicitly. */
export function InterviewHistoryList({
  open,
  count,
  children,
}: {
  open: boolean;
  count: number;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLUListElement>(null);
  const [hint, setHint] = useState("");
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const below =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 2;
    setHint(
      below
        ? "Scroll for more interviews ↓"
        : viewport.scrollTop > 2
          ? "More interviews above ↑"
          : `${count} saved interview${count === 1 ? "" : "s"}`,
    );
  }, [count]);
  useEffect(() => {
    if (!open) return;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    const frame = requestAnimationFrame(measure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [open, measure]);
  return (
    <>
      <div
        ref={viewportRef}
        onScroll={measure}
        tabIndex={0}
        aria-label="Saved interview list, newest first"
        className="max-h-[55dvh] [scrollbar-gutter:stable] overflow-y-auto overscroll-contain pr-1"
      >
        <ul ref={contentRef} className="space-y-3">
          {children}
        </ul>
      </div>
      {count > 0 && (
        <p
          role="status"
          className="mt-2 border-t border-black/10 pt-2 text-center text-xs text-black/60 dark:border-white/15 dark:text-white/60"
        >
          {hint}
        </p>
      )}
    </>
  );
}
