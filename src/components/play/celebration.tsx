"use client";
import { useState } from "react";
import { BADGE_LABELS } from "@/lib/play/public";
import styles from "./celebration.module.css";
export function Celebration({
  title,
  badges = [],
}: {
  title: string;
  badges?: string[];
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <aside className={styles.panel} aria-label="Milestone">
      <div role="status">
        <h2>{title}</h2>
        {badges.length > 0 && (
          <ul>
            {badges.map((id) => (
              <li key={id}>{badgeLabel(id)}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        className="practice-secondary"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </aside>
  );
}
function badgeLabel(id: string) {
  return Object.entries(BADGE_LABELS).find(([key]) => key === id)?.[1] ?? id;
}
