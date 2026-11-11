import { notFound } from "next/navigation";
import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { gapCards } from "@/lib/play/gap-cards";
import { PlayShell } from "@/components/play/play-shell";
export default async function GapPage({
  params,
}: {
  params: Promise<{ topic: string; gap: string }>;
}) {
  const userId = await playAccountId(),
    { topic, gap } = await params;
  const card = gapCards.find((value) => value.id === gap);
  if (!card || card.topic !== topic) notFound();
  return (
    <PlayShell userId={userId}>
      <Link className="practice-link" href={`/play/${topic}`}>
        Back to levels
      </Link>
      <article className="practice-surface">
        <h1>{card.title}</h1>
        <h2>What it is</h2>
        <p>{card.what}</p>
        <h2>Why interviewers ask</h2>
        <p>{card.why}</p>
        <h2>Common mistake</h2>
        <p>{card.mistake}</p>
        <h2>What a Senior answer sounds like</h2>
        <p>{card.senior}</p>
        <h2>Read more</h2>
        <ul>
          {card.links.map((link) => (
            <li key={link.href}>
              <a
                className="practice-link"
                href={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <p>Reading this card does not change points or readiness.</p>
      </article>
    </PlayShell>
  );
}
