import { expect, it } from "vitest";
import { topicRatingSchema } from "./topic-rating-public";
const sessionId = "11111111-1111-4111-8111-111111111111";
it.each([1, 2, 3, 4, 5])("accepts a %i-star response", (stars) => {
  expect(topicRatingSchema.parse({ sessionId, action: "rate", stars })).toEqual(
    { sessionId, action: "rate", stars },
  );
});
it.each([0, 6, 1.5, "5", null, undefined])(
  "rejects invalid stars %s",
  (stars) => {
    expect(
      topicRatingSchema.safeParse({ sessionId, action: "rate", stars }).success,
    ).toBe(false);
  },
);
it.each(["shown", "skip", "close"])(
  "accepts %s without an answer and rejects smuggled ownership/reward fields",
  (action) => {
    expect(topicRatingSchema.parse({ sessionId, action })).toEqual({
      sessionId,
      action,
    });
    for (const extra of [{ stars: 5 }, { userId: sessionId }, { points: 100 }])
      expect(
        topicRatingSchema.safeParse({ sessionId, action, ...extra }).success,
      ).toBe(false);
  },
);
