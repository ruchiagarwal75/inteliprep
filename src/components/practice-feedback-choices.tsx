"use client";

import styles from "./practice-feedback.module.css";

export function PracticeFeedbackChoices<T extends string>({
  question,
  choices,
  value,
  disabled,
  onChange,
}: {
  question: string;
  choices: readonly (readonly [T, string])[];
  value: T | undefined;
  disabled: boolean;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend>{question}</legend>
      <div className={styles.choices}>
        {choices.map(([choice, label]) => (
          <button
            key={choice}
            type="button"
            aria-pressed={value === choice}
            className={styles.choice}
            onClick={() => onChange(value === choice ? undefined : choice)}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
