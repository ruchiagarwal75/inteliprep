"use client";

import type { InterviewDuration } from "@/lib/interview-timer";

export function InterviewDurationPicker({
  value,
  disabled,
  onChange,
}: {
  value: InterviewDuration;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor="interview-duration" className="flex flex-col gap-1 text-sm">
      Duration
      <select
        id="interview-duration"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="bg-background rounded-md border border-black/15 px-3 py-2 disabled:opacity-70 dark:border-white/20"
      >
        <option value={45}>45 minutes</option>
        <option value={1}>1 minute (test)</option>
      </select>
    </label>
  );
}
