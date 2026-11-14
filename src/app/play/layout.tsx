import { Suspense, type ReactNode } from "react";
import { playAccountId } from "@/lib/play/access";
import { PlayShell } from "@/components/play/play-shell";
import { PlayLoadingFrame } from "@/components/play/play-loading";
export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PlayLoadingFrame />}>
      <AccountShell>{children}</AccountShell>
    </Suspense>
  );
}
async function AccountShell({ children }: { children: ReactNode }) {
  const userId = await playAccountId();
  return <PlayShell userId={userId}>{children}</PlayShell>;
}
