import Link from "next/link";
import { notFound } from "next/navigation";
import { playAccountId } from "@/lib/play/access";
import { playTopic } from "@/lib/play/catalog";
import { PlayShell } from "@/components/play/play-shell";
export const dynamic = "force-dynamic";
export default async function DrillPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const userId = await playAccountId(),
    { topic } = await params;
  if (!playTopic(topic)?.available) notFound();
  return (
    <PlayShell userId={userId}>
      <h1>Practice round</h1>
      <p>Choose a level to start a round.</p>
      <Link className="practice-primary" href={`/play/${topic}`}>
        Choose a level
      </Link>
    </PlayShell>
  );
}
