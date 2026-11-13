import { redirect } from "next/navigation";
import { playAccountId } from "@/lib/play/access";
import { openWelcome } from "@/lib/play/welcome-store";
import { WelcomeIntro } from "@/components/play/welcome-intro";
export const dynamic = "force-dynamic";
export default async function WelcomePage({
  searchParams,
}: PageProps<"/play/welcome">) {
  const userId = await playAccountId();
  const runId = await openWelcome(userId, (await searchParams).replay === "1");
  if (!runId) redirect("/play");
  return <WelcomeIntro key={runId} runId={runId} />;
}
