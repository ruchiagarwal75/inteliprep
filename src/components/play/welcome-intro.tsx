"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { WELCOME_PANELS } from "@/lib/play/welcome-copy";
import { WelcomeScene } from "./welcome-scene";
import styles from "./welcome-intro.module.css";
export function WelcomeIntro({ runId }: { runId: string }) {
  const { request } = useCandidateAccount(),
    router = useRouter();
  const [cursor, setCursor] = useState({ panel: 0, beat: 0 });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  const panel = WELCOME_PANELS[cursor.panel],
    beat = panel.beats[cursor.beat];
  const last = cursor.panel === 3 && cursor.beat === panel.beats.length - 1;
  useEffect(() => {
    dialog.current?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  function next() {
    if (busy || last) return;
    setCursor(
      cursor.beat + 1 < panel.beats.length
        ? { ...cursor, beat: cursor.beat + 1 }
        : { panel: cursor.panel + 1, beat: 0 },
    );
  }
  function back() {
    if (busy) return;
    if (cursor.beat > 0) setCursor({ ...cursor, beat: cursor.beat - 1 });
    else if (cursor.panel > 0)
      setCursor({
        panel: cursor.panel - 1,
        beat: WELCOME_PANELS[cursor.panel - 1].beats.length - 1,
      });
  }
  async function finish(action: "skip" | "complete", topic = false) {
    if (lock.current) return;
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
      router.replace(topic ? `/play/rag/topics/0?intro=${runId}` : "/play");
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
      onCancel={(e) => {
        e.preventDefault();
        void finish("skip");
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
        <h1 id="welcome-title" className={styles.title}>
          {panel.title}
        </h1>
        <WelcomeScene key={cursor.panel} panel={cursor.panel + 1} />
        <div className={styles.speech} aria-live="polite">
          <span className={styles.speaker}>{beat.speaker}</span>
          <p>{beat.line}</p>
          <span className={styles.arrow} aria-hidden="true">
            ▼
          </span>
        </div>
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
