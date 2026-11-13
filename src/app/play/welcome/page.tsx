import { redirect } from "next/navigation";
import { playAccountId } from "@/lib/play/access";
import { welcomeRequired } from "@/lib/play/welcome-store";
import { WelcomeSession } from "@/components/play/welcome-session";
export const dynamic = "force-dynamic";
export default async function WelcomePage({
  searchParams,
}: PageProps<"/play/welcome">) {
  const userId = await playAccountId();
  const replay = (await searchParams).replay === "1";
  if (!replay && !(await welcomeRequired(userId))) redirect("/play");
  return <WelcomeSession replay={replay} />;
}
