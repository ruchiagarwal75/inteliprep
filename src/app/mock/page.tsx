import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { problemBriefs } from "@/lib/problems";
import { PlayShell } from "@/components/play/play-shell";
import styles from "@/components/play/play.module.css";
export const dynamic = "force-dynamic";
export default async function MockPage() {
  const userId = await playAccountId(),
    problems = problemBriefs();
  return (
    <PlayShell userId={userId} active="mock">
      <h1>Mock interviews</h1>
      <p>Use a full interview to test your design and reasoning.</p>
      <Link className="practice-link" href="/mock/history">
        Saved mock interviews
      </Link>
      {(["genai", "core"] as const).map((track) => (
        <section
          id={track === "core" ? "fundamentals" : "ai-mocks"}
          key={track}
        >
          <h2>{track === "core" ? "Fundamentals" : "AI / ML system design"}</h2>
          <ul className={styles.topicList}>
            {problems
              .filter((p) => p.track === track)
              .map((p) => (
                <li key={p.problemId} className={styles.topic}>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.summary}</p>
                  </div>
                  <Link
                    className="practice-secondary"
                    href={`/interview/new?problem=${p.problemId}`}
                  >
                    Choose mock
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </PlayShell>
  );
}
