import type { MockPlan } from "./mock-access-public";
export type BossResult = {
  sessionId: string;
  score: number | null;
  signal: string | null;
};
export type RagBossState = {
  plan: MockPlan;
  worldClearedSeenAt: string | null;
} & (
  | { state: "locked" | "ready" }
  | { state: "in_progress"; sessionId: string }
  | { state: "used" | "retry"; result: BossResult | null }
  | { state: "defeated"; result: BossResult; defeatedAt: string }
);
