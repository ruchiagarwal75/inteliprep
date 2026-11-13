import { notFound } from "next/navigation";
import { playAccountId } from "@/lib/play/access";
import { playerSnapshot } from "@/lib/play/player";
import { CourseWorld } from "@/components/play/course-world";
import { startedCourseLevels } from "@/lib/play/course/visits";
export const dynamic = "force-dynamic";
export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await playAccountId();
  if ((await params).topic !== "rag") notFound();
  const [snapshot, started] = await Promise.all([
    playerSnapshot(userId),
    startedCourseLevels(userId),
  ]);
  const query = await searchParams;
  const primerUnlock =
    query.primer === "1" &&
    query.unlocked === "1" &&
    snapshot.levels.some(
      (row) =>
        row.topic === "rag-course" &&
        row.level === 0 &&
        row.status === "passed",
    );
  return (
    <CourseWorld
      snapshot={snapshot}
      started={started}
      primerUnlock={primerUnlock}
    />
  );
}
