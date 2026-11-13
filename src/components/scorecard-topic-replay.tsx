import Link from "next/link";
import { ragReplayTopics } from "@/lib/rag-topic-replay";
import { courseTopicHref } from "@/lib/play/course/metadata";
export function ScorecardTopicReplay({
  problemId,
  area,
  score,
}: {
  problemId: string;
  area: string;
  score: number | null;
}) {
  const topics = ragReplayTopics(problemId, area, score);
  if (!topics.length) return null;
  return (
    <nav
      aria-label={`Replay topics for ${area}`}
      className="flex flex-wrap gap-3"
    >
      {topics.map((topic) => (
        <Link
          key={topic}
          className="practice-link"
          href={courseTopicHref(topic)}
        >
          Replay Topic {topic}
        </Link>
      ))}
    </nav>
  );
}
