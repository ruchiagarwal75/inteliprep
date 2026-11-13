import { z } from "zod";
/** Public entitlements. The server owns every decision and state change. */
export const mockAccessSchema = z.object({
  plan: z.enum(["free", "pro"]),
  admin: z.boolean(),
  freeBossUsedAt: z.iso.datetime().nullable(),
  freeBossSessionId: z.uuid().nullable(),
  proInterestAt: z.iso.datetime().nullable(),
  worldClearedSeenAt: z.iso.datetime().nullable(),
});
export type MockAccess = z.infer<typeof mockAccessSchema>;
export type MockPlan = MockAccess["plan"];
export const RAG_BOSS = {
  problemId: "enterprise-rag-assistant",
  level: "mid",
  durationMinutes: 45,
  href: "/play/rag#rag-boss",
  promptHref: "/play/rag?from=play#rag-boss",
} as const;
