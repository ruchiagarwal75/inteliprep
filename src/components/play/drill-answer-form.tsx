"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DrillAnswer, DrillQuestion } from "@/lib/play/public";
import { choiceShortcut } from "./keyboard-play";
import styles from "./drill.module.css";
import { GameGuide } from "./game-guide";
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
    [value, setValue] = useState(""),
    [unit, setUnit] = useState(
      question.type === "math" ? question.units[0].id : "",
    ),
    [option, setOption] = useState<"0" | "1" | "2" | "3">(),
    [text, setText] = useState(""),
    [decision, setDecision] = useState(""),
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
    switch (question.type) {
      case "math": {
        const number = Number(value);
        if (!value.trim() || !Number.isFinite(number) || number < 0) {
          setError("Enter a positive number or zero.");
          return;
        }
        onAnswer({ type: "math", value: number, unit });
        break;
      }
      case "spot_flaw":
        if (option === undefined) {
          setError("Choose one answer.");
          return;
        }
        onAnswer({ type: "spot_flaw", option });
        break;
      case "pick_probe":
        if (text.trim()) onAnswer({ type: "pick_probe", text: text.trim() });
        break;
      case "tradeoff":
        if (decision.trim() && text.trim())
          onAnswer({
            type: "tradeoff",
            decision: decision.trim(),
            reason: text.trim(),
          });
        break;
    }
  }
  const ready =
    question.type === "spot_flaw"
      ? option !== undefined
      : question.type === "math"
        ? Boolean(value.trim()) &&
          Number.isFinite(Number(value)) &&
          Number(value) >= 0
        : question.type === "pick_probe"
          ? Boolean(text.trim())
          : Boolean(decision.trim() && text.trim());
  return (
    <form ref={form} onSubmit={submit} className={styles.form} aria-busy={busy}>
      <fieldset disabled={busy}>
        <legend className={styles.legend}>Your answer</legend>
        {question.type === "math" && (
          <div className={styles.mathInputs}>
            <label htmlFor={id + "-number"}>
              Value
              <input
                id={id + "-number"}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                autoComplete="off"
              />
            </label>
            <label htmlFor={id + "-unit"}>
              Unit
              <select
                id={id + "-unit"}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {question.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
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
        {question.type === "tradeoff" && (
          <label htmlFor={id + "-call"}>
            Your call
            <input
              id={id + "-call"}
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              maxLength={300}
              required
            />
          </label>
        )}
        {(question.type === "pick_probe" || question.type === "tradeoff") && (
          <label htmlFor={id + "-text"}>
            {question.type === "pick_probe"
              ? "Your follow-up question"
              : "Your reason, in 1 to 3 sentences"}
            <textarea
              id={id + "-text"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={4}
              required
            />
          </label>
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
        {busy &&
          (question.type === "tradeoff" || question.type === "pick_probe") && (
            <GameGuide pose="thinking" />
          )}
        <button
          className="practice-primary"
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
