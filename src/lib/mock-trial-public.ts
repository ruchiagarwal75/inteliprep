import { z } from "zod";

const problem = { problemId: z.string().min(1).max(100) };
export const mockTrialSchema = z.discriminatedUnion("state", [
  z.object({ ...problem, state: z.literal("not_requested") }),
  z.object({ ...problem, state: z.literal("requested") }),
  z.object({ ...problem, state: z.literal("approved") }),
  z.object({ ...problem, state: z.literal("revoked") }),
  z.object({ ...problem, state: z.literal("used"), sessionId: z.uuid() }),
]);
export type MockTrial = z.infer<typeof mockTrialSchema>;
export const mockTrialsSchema = z.array(mockTrialSchema);
export const mockTrialCommandSchema = z.strictObject({
  problemId: problem.problemId,
});
export const mockTrialViewsSchema = z.strictObject({
  problemIds: z.array(problem.problemId).min(1).max(20),
});
