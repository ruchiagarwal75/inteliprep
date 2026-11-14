import "server-only";
/** Guardrails, not engagement targets. UTC accounting is shared across instances. */
export const PLAY_LIMITS = {
  aiGradesPerUserPerDay: 150,
} as const;
