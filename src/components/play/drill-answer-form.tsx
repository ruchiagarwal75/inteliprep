"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DrillAnswer, DrillQuestion } from "@/lib/play/public";
import { choiceShortcut } from "./keyboard-play";
import styles from "./drill.module.css";
import { prepareGameSounds } from "./game-sounds";
export function DrillAnswerForm({
  question,
  busy,
  onAnswer,
}: {
  question: DrillQuestion;
  busy: boolean;
  onAnswer: (answer: DrillAnswer) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const id = useId(),
    [option, setOption] = useState<"0" | "1" | "2" | "3">(),
    [error, setError] = useState("");
  useEffect(() => {
    if (question.type !== "spot_flaw") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        target.closest('[role="dialog"], [role="menu"]') ||
        target.isContentEditable ||
        target.closest('textarea,select,input:not([type="radio"])')
      )
        return;
      if (target !== document.body && !form.current?.contains(target)) return;
      const action = choiceShortcut(event, busy);
      if (action === undefined) return;
      event.preventDefault();
      if (action === "submit") form.current?.requestSubmit();
      else {
        const choice = question.options[action];
        if (choice) {
          setOption(choice.id);
          form.current
            ?.querySelectorAll<HTMLInputElement>('input[type="radio"]')
            [action]?.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [question, busy]);
  function submit(event: FormEvent) {
    event.preventDefault();
    prepareGameSounds();
    setError("");
    if (question.type !== "spot_flaw") return;
    if (option === undefined) {
      setError("Choose one answer.");
      return;
    }
    onAnswer({ type: "spot_flaw", option });
  }
  const ready = question.type === "spot_flaw" && option !== undefined;
  return (
    <form ref={form} onSubmit={submit} className={styles.form} aria-busy={busy}>
      <fieldset disabled={busy}>
        <legend className={styles.legend}>Your answer</legend>
        {question.type === "spot_flaw" && (
          <div className={styles.options}>
            {question.options.map((choice, i) => (
              <label key={choice.id} className={styles.option}>
                <input
                  type="radio"
                  name={id}
                  checked={option === choice.id}
                  onChange={() => setOption(choice.id)}
                  required
                />
                <span>
                  <strong>{i + 1}.</strong> {choice.text}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {question.type === "spot_flaw" && (
        <p className={styles.hint}>1 to 4 to choose. Enter to check.</p>
      )}
      <div className={styles.checkDock}>
        <button
          className="practice-primary"
          data-game-label
          disabled={busy || !ready}
          type="submit"
          aria-label={busy ? "Checking..." : "Check answer"}
        >
          {busy ? "Checking..." : "Check"}
        </button>
      </div>
    </form>
  );
}
