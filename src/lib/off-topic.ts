export const DESIGN_REDIRECT = "Let's stay on your design.";

/** Recognize explicit unrelated tasks/instruction attacks; normal design narration stays eligible. */
export function isOffTopicRequest(content: string): boolean {
  const text = content.trim();
  return (
    /^(?:(?:please|hey|hi)[,\s]+)?(?:(?:can|could|would|will)\s+you\s+)?(?:write|compose|generate|create|tell)\s+(?:(?:me|us|a|an|some|short|funny|little|the|beautiful|quick)\s+){0,6}(?:poem|poetry|song|story|joke|code|translation)\b/iu.test(
      text,
    ) ||
    /^(?:(?:please|can you|could you)\s+)?translate\b/iu.test(text) ||
    /ignore.{0,40}(?:instructions|rules)|(?:print|reveal|show).{0,30}(?:system prompt|hidden instructions)|^system\s*:|note to (?:the )?grader|give.{0,30}(?:4\/4|full credit)/iu.test(
      text,
    )
  );
}
