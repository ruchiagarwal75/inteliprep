"use client";
import { useId } from "react";
import type { ProblemTrack } from "@/lib/interview-selection";
import { TRACK_LABELS, TRACK_DESCRIPTIONS } from "@/lib/problem-track";
import styles from "./problem-track.module.css";
export function ProblemTrackToggle({
  value,
  disabled,
  onChange,
}: {
  value: ProblemTrack;
  disabled: boolean;
  onChange: (track: ProblemTrack) => void;
}) {
  const id = useId();
  return (
    <fieldset
      role="radiogroup"
      aria-label="Interview track"
      aria-describedby={id}
      disabled={disabled}
      className={styles.track}
    >
      <legend>Interview track</legend>
      <div className={styles.options}>
        {(["core", "genai"] as const).map((track) => (
          <label className={styles.option} key={track}>
            <input
              type="radio"
              name={`track-${id}`}
              value={track}
              checked={value === track}
              onChange={() => onChange(track)}
            />
            <span>{TRACK_LABELS[track]}</span>
          </label>
        ))}
      </div>
      <p id={id} className={styles.description}>
        {TRACK_DESCRIPTIONS[value]}
      </p>
    </fieldset>
  );
}
