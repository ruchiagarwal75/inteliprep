import { notFound } from "next/navigation";
import { z } from "zod";
import { PracticePage } from "@/components/practice-page";
export const dynamic = "force-dynamic";
export default async function Interview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <PracticePage view="interview" sessionId={id} />;
}
