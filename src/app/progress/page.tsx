import { playAccountId } from "@/lib/play/access";
import { PlayShell } from "@/components/play/play-shell";
export const dynamic = "force-dynamic";
export default async function ProgressPage() {
  const userId = await playAccountId();
  return (
    <PlayShell userId={userId} active="progress">
      <h1>Your readiness map</h1>
      <p>Your practice results will appear here.</p>
      <p>Based on your practice here. Not a hiring guarantee.</p>
    </PlayShell>
  );
}
