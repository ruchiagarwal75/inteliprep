import { PlayRewardsProvider } from "./play-rewards";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { CandidateProfileMenu } from "@/components/candidate-profile-menu";
import { CandidateAccountProvider } from "@/components/candidate-account-provider";
import { LegalLinks } from "@/components/legal-links";
import { ModeNav } from "./mode-nav";
import styles from "./play.module.css";
import { PlayFrame } from "./play-frame";
import type { PlayerSnapshot } from "@/lib/play/player";
import { playerSnapshot } from "@/lib/play/player";
import { PlayerBootstrap } from "./player-bootstrap";
export async function PlayShell({
  userId,
  active = "play",
  children,
  points,
  streak,
  snapshot: suppliedSnapshot,
}: {
  userId: string;
  active?: "play" | "mock" | "progress";
  children: ReactNode;
  points?: number;
  streak?: number;
  snapshot?: PlayerSnapshot;
}) {
  let unavailable = false;
  let initializeTimeZone = false;
  let dailyGoal: boolean | undefined;
  try {
    const snapshot = suppliedSnapshot ?? (await playerSnapshot(userId));
    initializeTimeZone = !snapshot.zoneSet;
    dailyGoal = snapshot.dailyGoal;
    points = snapshot.points;
    streak = snapshot.streak;
  } catch {
    unavailable = true;
  }
  return (
    <CandidateAccountProvider userId={userId}>
      <PlayRewardsProvider
        initial={
          points !== undefined && streak !== undefined
            ? { points, streak, dailyGoal }
            : undefined
        }
      >
        <PlayFrame active={active}>
          <div className="practice-shell">
            {initializeTimeZone && <PlayerBootstrap />}
            <header className="practice-nav">
              <Brand />
              <CandidateProfileMenu />
            </header>
            <ModeNav active={active} points={points} streak={streak} />
            <div className={styles.content}>
              {unavailable && (
                <p role="status" className={styles.note}>
                  Practice progress is unavailable right now. You can still use
                  Mock. Please try Play again in a moment.
                </p>
              )}
              {children}
            </div>
            <LegalLinks />
          </div>
        </PlayFrame>
      </PlayRewardsProvider>
    </CandidateAccountProvider>
  );
}
