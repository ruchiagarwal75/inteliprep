import Link from "next/link";
import { GameGuide } from "./game-guide";
import styles from "./course-unlock.module.css";
type Props = { onDismiss: () => void } & (
  { kind: "unlocked" } | { kind: "cleared"; resultsHref: string }
);
/** Shared presentation for the course unlock and verified boss victory. */
export function WorldNotice(props: Props) {
  const cleared = props.kind === "cleared";
  const title = cleared ? "RAG World cleared" : "World unlocked";
  return (
    <section
      className={styles.notice}
      role="status"
      aria-label={title}
      data-world-cleared={cleared || undefined}
    >
      <h2 data-game-label>{title}</h2>
      <p>
        {cleared
          ? "Your RAG design met the Mid-level interview bar."
          : "9 topics open up. Next: Ingestion and chunking."}
      </p>
      <GameGuide
        size="small"
        pose="cheer"
        message={cleared ? "You did it!" : "Let's go deeper"}
        bubble="speech"
      />
      <div className={styles.actions}>
        <Link
          className="practice-primary"
          href={
            props.kind === "cleared" ? props.resultsHref : "/play/rag/topics/1"
          }
        >
          {cleared ? "View scorecard" : "Start Topic 1"}
        </Link>
        <button
          type="button"
          className="practice-link"
          onClick={props.onDismiss}
        >
          {cleared ? "Done" : "Later"}
        </button>
      </div>
    </section>
  );
}
