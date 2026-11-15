import { playAccountId } from "@/lib/play/access";
import { problemBriefs } from "@/lib/problems";
import { PlayShell } from "@/components/play/play-shell";
import { ragBossState } from "@/lib/rag-boss-state";
import { MockCatalog } from "@/components/locked-mocks";
import { mockTrials } from "@/lib/mock-trial-store";
export const dynamic = "force-dynamic";
export default async function MockPage() {
  const userId = await playAccountId();
  const [boss, trials] = await Promise.all([
    ragBossState(userId),
    mockTrials(userId),
  ]);
  return (
    <PlayShell userId={userId} active="mock">
      <MockCatalog problems={problemBriefs()} boss={boss} trials={trials} />
    </PlayShell>
  );
}
