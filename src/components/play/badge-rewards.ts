import type { BADGE_LABELS } from "@/lib/play/public";
export const BADGE_REWARDS = [
  { id: "first-level", meaning: "Clear your first practice level." },
  { id: "math-five", meaning: "Get 5 math drills right in a row." },
  { id: "rag-practice", meaning: "Clear all 4 RAG levels." },
  {
    id: "rag-interview",
    meaning: "Meet your chosen level's bar in a RAG mock.",
  },
  { id: "streak-seven", meaning: "Build a 7-day practice streak." },
] as const satisfies readonly {
  id: keyof typeof BADGE_LABELS;
  meaning: string;
}[];
