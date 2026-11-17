import { Suspense, type ReactNode } from "react";
import { guestPlayAccount } from "@/lib/play/access";
import { PlayShell } from "@/components/play/play-shell";
import { PlayLoadingFrame } from "@/components/play/play-loading";
import { headers } from "next/headers";
import { GuestStart } from "@/components/play/guest-start";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { startGuestPlayer } from "@/lib/play/guest-events";
export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PlayLoadingFrame />}>
      <AccountShell>{children}</AccountShell>
    </Suspense>
  );
}
async function AccountShell({ children }: { children: ReactNode }) {
  const account = await guestPlayAccount();
  if (!account) {
    const policy = (await headers()).get("Content-Security-Policy") ?? "";
    const nonce = /'nonce-([^']+)'/u.exec(policy)?.[1];
    return (
      <main className="practice-page">
        <div className="practice-shell">
          <header className="practice-nav">
            <Brand />
            <ThemeToggle />
          </header>
          <GuestStart nonce={nonce} />
        </div>
      </main>
    );
  }
  if (account.kind === "guest") await startGuestPlayer(account.id);
  return (
    <PlayShell userId={account.id} guest={account.kind === "guest"}>
      {children}
    </PlayShell>
  );
}
