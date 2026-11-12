import { playProgressTopic } from "@/lib/play/course/metadata";
import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { PLAY_TOPICS } from "@/lib/play/catalog";
import { playerSnapshot } from "@/lib/play/player";
import { shownReadiness } from "@/lib/play/readiness-policy";
import { PlayShell } from "@/components/play/play-shell";
import { TargetLevel } from "@/components/play/target-level";
import { MockPrompt } from "@/components/play/mock-prompt";
import { BADGE_LABELS } from "@/lib/play/public";
import styles from "@/components/play/play.module.css";
export const dynamic = "force-dynamic";
const labels = {
  not_tested: "Not tested",
  gap: "Needs practice",
  practice_ready: "Practice ready",
  interview_ready: "Interview ready",
};
export default async function ProgressPage() {
  const userId = await playAccountId(),
    snapshot = await playerSnapshot(userId),
    now = new Date();
  const rows = PLAY_TOPICS.map((topic) => {
    const stored = snapshot.readiness.find(
        (row) => row.topic === playProgressTopic(topic.id),
      ),
      state = shownReadiness(
        {
          state: stored?.state ?? "not_tested",
          verifiedLevel: stored?.verified_level ?? null,
          lastActivityAt: stored?.last_activity_at ?? null,
        },
        snapshot.level,
        now,
      );
    return { topic, state, stored };
  });
  const available = rows.filter((row) => row.topic.available),
    ready = available.filter((row) => row.state === "interview_ready").length,
    levelName =
      snapshot.level === "mid"
        ? "Mid-level"
        : snapshot.level === "senior"
          ? "Senior"
          : "Staff";
  return (
    <PlayShell userId={userId} active="progress" snapshot={snapshot}>
      <h1>Your readiness map</h1>
      <p>
        {levelName} AI engineer bar: {ready} of {available.length}{" "}
        {available.length === 1 ? "topic" : "topics"} ready
      </p>
      <TargetLevel value={snapshot.level} />
      {rows
        .filter(
          (row) =>
            row.state === "practice_ready" &&
            !row.stored?.prompt_seen_at &&
            row.topic.mockProblemId,
        )
        .map((row) => (
          <MockPrompt
            key={row.topic.id}
            topic={playProgressTopic(row.topic.id)}
            title={row.topic.title}
            problemId={row.topic.mockProblemId ?? ""}
            level={snapshot.level}
          />
        ))}
      <ul className={styles.topicList}>
        {rows.map(({ topic, state }) => (
          <li className={styles.topic} key={topic.id}>
            <div>
              <h2>{topic.title}</h2>
              <p>
                {labels[state]}
                {!topic.available ? " · Coming soon" : ""}
              </p>
            </div>
            {topic.available && (
              <Link
                className="practice-secondary"
                href={
                  state === "practice_ready" && topic.mockProblemId
                    ? `/interview/new?problem=${topic.mockProblemId}&level=${snapshot.level}`
                    : `/play/${topic.id}`
                }
              >
                {state === "practice_ready" ? "Try a mock" : "Practice"}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        Based on your practice here. Not a hiring guarantee.
      </p>
      <p className={styles.note}>
        Coming-soon topics are not counted. Interview readiness needs a passing
        mock at your chosen level and expires after 21 days without topic
        activity.
      </p>
      <section className="practice-surface">
        <h2>Milestones</h2>
        {snapshot.badges.length ? (
          <ul>
            {snapshot.badges.map((badge) => (
              <li key={badge.badge_id}>
                {Object.entries(BADGE_LABELS).find(
                  ([id]) => id === badge.badge_id,
                )?.[1] ?? badge.badge_id}
              </li>
            ))}
          </ul>
        ) : (
          <p>Finish a level to earn your first badge.</p>
        )}
        <p>Streak freezes: {snapshot.freezes} of 2</p>
        <p className={styles.note}>Calendar days use {snapshot.timeZone}.</p>
      </section>
    </PlayShell>
  );
}
