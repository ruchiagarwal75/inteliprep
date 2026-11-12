import { LockIcon } from "./game-icons";
import styles from "./play.module.css";
function drawing(topic: string) {
  switch (topic) {
    case "rag":
      return (
        <>
          <path d="M4 5h10l4 4v18H4zM14 5v5h4M7 14h8M7 18h6" />
          <circle cx="22" cy="21" r="6" />
          <path d="m26 25 4 4" />
        </>
      );
    case "chat-serving":
      return (
        <>
          <path d="M4 5h24v18H15l-7 6v-6H4z" />
          <circle cx="10" cy="14" r="1" />
          <circle cx="16" cy="14" r="1" />
          <circle cx="22" cy="14" r="1" />
        </>
      );
    case "agents":
      return (
        <>
          <rect x="12" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="22" width="8" height="8" rx="2" />
          <rect x="21" y="22" width="8" height="8" rx="2" />
          <path d="M16 11v6H7v5m9-5h9v5" />
        </>
      );
    default:
      return (
        <>
          <path d="M8 29V4h18l-4 6 4 6H8" />
          <path d="m12 9 3 3 5-5" />
        </>
      );
  }
}
export function TopicIcon({
  topic,
  locked,
}: {
  topic: string;
  locked: boolean;
}) {
  return (
    <div className={styles.worldIcon}>
      <svg
        viewBox="0 0 34 34"
        width="44"
        height="44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {drawing(topic)}
      </svg>
      {locked && (
        <span className={styles.lockMark}>
          <LockIcon width="18" height="18" />
        </span>
      )}
    </div>
  );
}
