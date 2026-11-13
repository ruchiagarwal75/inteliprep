"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { WELCOME_PANELS } from "@/lib/play/welcome-copy";
import { WelcomeScene } from "./welcome-scene";
import styles from "./welcome-intro.module.css";
const motionSubscribe = (changed: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", changed);
  return () => mq.removeEventListener("change", changed);
};
const motionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const visibilitySubscribe = (changed: () => void) => {
  document.addEventListener("visibilitychange", changed);
  return () => document.removeEventListener("visibilitychange", changed);
};
const hiddenSnapshot = () => document.hidden;
const serverSnapshot = () => false;
export function WelcomeIntro({ runId }: { runId: string }) {
  const { request } = useCandidateAccount();
  const [cursor, setCursor] = useState({ panel: 0, beat: 0, chars: 0 });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const reduced = useSyncExternalStore(
    motionSubscribe,
    motionSnapshot,
    serverSnapshot,
  );
  const hidden = useSyncExternalStore(
    visibilitySubscribe,
    hiddenSnapshot,
    serverSnapshot,
  );
  const panel = WELCOME_PANELS[cursor.panel],
    beat = panel.beats[cursor.beat];
  const last = cursor.panel === 3 && cursor.beat === panel.beats.length - 1;
  const done = reduced || cursor.chars >= beat.line.length;
  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [cursor.panel, cursor.beat]);
  useEffect(() => {
    if (done || hidden) return;
    const timer = window.setInterval(
      () =>
        setCursor((current) => ({
          ...current,
          chars: Math.min(current.chars + 1, beat.line.length),
        })),
      1000 / 30,
    );
    return () => window.clearInterval(timer);
  }, [done, hidden, beat.line]);
  function next() {
    if (busy) return;
    if (!done) {
      setCursor({ ...cursor, chars: beat.line.length });
      return;
    }
    if (last) return;
    setCursor(
      cursor.beat + 1 < panel.beats.length
        ? { ...cursor, beat: cursor.beat + 1, chars: 0 }
        : { panel: cursor.panel + 1, beat: 0, chars: 0 },
    );
  }
  function back() {
    if (busy) return;
    if (cursor.beat > 0)
      setCursor({ ...cursor, beat: cursor.beat - 1, chars: 0 });
    else if (cursor.panel > 0)
      setCursor({
        panel: cursor.panel - 1,
        beat: WELCOME_PANELS[cursor.panel - 1].beats.length - 1,
        chars: 0,
      });
  }
  async function finish(action: "skip" | "complete", topic = false) {
    if (lock.current) return;
    if (action === "complete" && !done) {
      next();
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await request("/api/play/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, action, panel: cursor.panel + 1 }),
      });
      if (!response.ok) throw Error("save");
      window.location.replace(
        topic ? `/play/rag/topics/0?intro=${runId}` : "/play",
      );
    } catch {
      lock.current = false;
      setBusy(false);
      setError("Could not save. Please try again.");
    }
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="welcome-title"
      data-paused={hidden || undefined}
      onCancel={(event) => {
        event.preventDefault();
        void finish("skip");
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          next();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          back();
        } else if (
          event.key === "Enter" &&
          !(event.target instanceof HTMLButtonElement)
        ) {
          event.preventDefault();
          next();
        }
      }}
    >
      <div className={styles.shell}>
        <header className={styles.top}>
          <small>{cursor.panel + 1} / 4</small>
          <button
            className={styles.skip}
            disabled={busy}
            onClick={() => void finish("skip")}
          >
            Skip
          </button>
        </header>
        <h1
          id="welcome-title"
          ref={heading}
          tabIndex={-1}
          className={styles.title}
        >
          {panel.title}
        </h1>
        <WelcomeScene key={cursor.panel} panel={cursor.panel + 1} />
        <button
          className={styles.speech}
          onClick={next}
          disabled={busy}
          aria-label={done ? "Continue dialogue" : "Show full dialogue"}
        >
          <span className={styles.speaker}>{beat.speaker}</span>
          <span className={styles.typed} aria-hidden="true">
            {beat.line.slice(0, cursor.chars)}
          </span>
          <span className={styles.full} aria-live="polite">
            {beat.line}
          </span>
          {done && (
            <span className={styles.arrow} aria-hidden="true">
              ▼
            </span>
          )}
        </button>
        <div
          className={styles.dots}
          aria-label={`Panel ${cursor.panel + 1} of 4`}
        >
          {WELCOME_PANELS.map((p, i) => (
            <span
              key={p.title}
              aria-current={i === cursor.panel ? "step" : undefined}
            />
          ))}
        </div>
        <footer className={styles.actions}>
          <button
            className={styles.back}
            disabled={busy || (cursor.panel === 0 && cursor.beat === 0)}
            onClick={back}
          >
            Back
          </button>
          {last ? (
            <div className={styles.final}>
              <button
                className="practice-primary"
                disabled={busy}
                onClick={() => void finish("complete", true)}
              >
                Start Topic 0
              </button>
              <button
                className={styles.look}
                disabled={busy}
                onClick={() => void finish("complete")}
              >
                Look around first
              </button>
            </div>
          ) : (
            <button className="practice-primary" disabled={busy} onClick={next}>
              Next
            </button>
          )}
        </footer>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
