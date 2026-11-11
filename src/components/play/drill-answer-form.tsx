"use client";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import type { DrillAnswer, DrillQuestion } from "@/lib/play/public";
import styles from "./drill.module.css";
export function DrillAnswerForm({
  question,
  busy,
  onAnswer,
}: {
  question: DrillQuestion;
  busy: boolean;
  onAnswer: (answer: DrillAnswer) => void;
}) {
  const id = useId(),
    [value, setValue] = useState(""),
    [unit, setUnit] = useState(
      question.type === "math" ? question.units[0].id : "",
    ),
    [option, setOption] = useState<"0" | "1" | "2" | "3">(),
    [text, setText] = useState(""),
    [decision, setDecision] = useState(""),
    [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
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
  return (
    <form onSubmit={submit} className={styles.form}>
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
                  <strong>{String.fromCharCode(65 + i)}.</strong> {choice.text}
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
      <button className="practice-primary" disabled={busy} type="submit">
        {busy ? "Checking..." : "Check answer"}
      </button>
    </form>
  );
}
