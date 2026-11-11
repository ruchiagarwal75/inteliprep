import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { CandidateProfileMenu } from "@/components/candidate-profile-menu";
import { CandidateAccountProvider } from "@/components/candidate-account-provider";
import { LegalLinks } from "@/components/legal-links";
import { ModeNav } from "./mode-nav";
import styles from "./play.module.css";
export function PlayShell({
  userId,
  active = "play",
  children,
  points,
  streak,
}: {
  userId: string;
  active?: "play" | "mock" | "progress";
  children: ReactNode;
  points?: number;
  streak?: number;
}) {
  return (
    <CandidateAccountProvider userId={userId}>
      <main className="practice-page">
        <div className="practice-shell">
          <header className="practice-nav">
            <Brand />
            <CandidateProfileMenu />
          </header>
          <ModeNav active={active} points={points} streak={streak} />
          <div className={styles.content}>{children}</div>
          <LegalLinks />
        </div>
      </main>
    </CandidateAccountProvider>
  );
}
