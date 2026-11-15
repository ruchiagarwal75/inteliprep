import { z } from "zod";

export const topicRatingSchema = z.discriminatedUnion("action", [
  z.strictObject({
    sessionId: z.uuid(),
    action: z.literal("rate"),
    stars: z.number().int().min(1).max(5),
  }),
  z.strictObject({
    sessionId: z.uuid(),
    action: z.enum(["shown", "skip", "close"]),
  }),
]);
export const topicRatingStatusSchema = z.strictObject({
  eligible: z.boolean(),
});
export type TopicRatingInput = z.infer<typeof topicRatingSchema>;

export function topicRatingKey(userId: string) {
  return `practice:first-topic-rating:${userId}`;
}
