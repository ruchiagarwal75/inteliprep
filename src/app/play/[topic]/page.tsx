import { notFound } from "next/navigation";
import { playAccountId } from "@/lib/play/access";
import { playerSnapshot } from "@/lib/play/player";
import { CourseWorld } from "@/components/play/course-world";
import { startedCourseLevels } from "@/lib/play/course/visits";
export const dynamic = "force-dynamic";
export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const userId = await playAccountId();
  if ((await params).topic !== "rag") notFound();
  const [snapshot, started] = await Promise.all([
    playerSnapshot(userId),
    startedCourseLevels(userId),
  ]);
  return <CourseWorld snapshot={snapshot} started={started} />;
}
