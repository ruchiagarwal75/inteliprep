import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { playTopic } from "@/lib/play/catalog";
import { DrillRunner } from "@/components/play/drill-runner";
export const dynamic = "force-dynamic";
export default async function DrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { topic } = await params,
    { session } = await searchParams;
  if (!playTopic(topic)?.available) notFound();
  const id = z.uuid().safeParse(session);
  return (
    <>
      {id.success ? (
        <DrillRunner key={id.data} sessionId={id.data} topic={topic} />
      ) : (
        <>
          <h1>Practice round</h1>
          <p>Choose a level to start a round.</p>
          <Link className="practice-primary" href={`/play/${topic}`}>
            Choose a level
          </Link>
        </>
      )}
    </>
  );
}
