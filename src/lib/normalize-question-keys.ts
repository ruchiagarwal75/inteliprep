import legacyKeys from "@/lib/legacy-question-keys.json";
import { internalQuestionKey } from "@/lib/internal-question-key";
import type { PendingQuestion } from "@/lib/open-question-queue";
type QuestionKeys = {
  openQuestions?: PendingQuestion[];
  topicTurnCounts?: Record<string, number>;
  coveredTopics?: string[];
};
/** Preserve old stage prefixes and fresh hashes while normalizing the topic part. */
export function normalizedTopicCounter(key: string) {
  if (key.startsWith("mmq7-") || key.startsWith("fresh:")) return key;
  const colon = key.indexOf(":");
  return colon < 0
    ? internalQuestionKey(key)
    : key.slice(0, colon + 1) + internalQuestionKey(key.slice(colon + 1));
}
/** Read compatibility only. Never rewrite transcript text, evidence, timing or drawings. */
export function normalizeQuestionKeys(state: QuestionKeys): QuestionKeys {
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(state.topicTurnCounts ?? {})) {
    const next = normalizedTopicCounter(key);
    counts[next] = Math.max(counts[next] ?? 0, value);
  }
  return {
    ...(state.openQuestions && {
      openQuestions: state.openQuestions.map((question) => ({
        ...question,
        ...(question.topicId
          ? { topicId: internalQuestionKey(question.topicId) }
          : {}),
      })),
    }),
    ...(state.topicTurnCounts && { topicTurnCounts: counts }),
    ...(state.coveredTopics && {
      coveredTopics: [
        ...new Set(
          state.coveredTopics.map((topic) =>
            topic.startsWith("issue:")
              ? "issue:" + internalQuestionKey(topic.slice(6))
              : legacyKeys.includes(topic)
                ? internalQuestionKey(topic)
                : topic,
          ),
        ),
      ],
    }),
  };
}
