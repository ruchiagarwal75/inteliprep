import { notFound } from "next/navigation";
import { playAccountId } from "@/lib/play/access";
import { courseLesson } from "@/lib/play/course/visits";
import { PlayError } from "@/lib/play/errors";
import { CourseSlides } from "@/components/play/course-slides";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function CourseTopicPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const user = await playAccountId(),
    level = Number((await params).level);
  if (!Number.isSafeInteger(level) || level < 0 || level > 9) notFound();
  const lesson = await courseLesson(user, level).catch((cause: unknown) => {
    if (cause instanceof PlayError && [403, 404].includes(cause.status))
      return { error: cause };
    throw cause;
  });
  if ("error" in lesson)
    return (
      <section className="practice-surface">
        <h1>{lesson.error.status === 403 ? "Topic locked" : "Coming soon"}</h1>
        <p>{lesson.error.message}</p>
        <Link className="practice-primary" href="/play/rag">
          Back to topics
        </Link>
      </section>
    );
  return <CourseSlides key={lesson.level} {...lesson} />;
}
