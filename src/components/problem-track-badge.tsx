import type { ProblemTrack } from "@/lib/interview-selection";
import styles from "./problem-track.module.css";
export function ProblemTrackBadge({ track }: { track?: ProblemTrack }) {
  return track === "genai" ? (
    <span className={styles.badge} aria-label="AI / ML system design">
      AI
    </span>
  ) : null;
}
