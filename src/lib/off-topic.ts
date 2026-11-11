export const DESIGN_REDIRECT = "Let's stay on your design.";

/** Recognize explicit unrelated tasks/instruction attacks; normal design narration stays eligible. */
export function isOffTopicRequest(content: string, _genai = false): boolean {
  // Retain the legacy track argument; direct-request rules now apply to both tracks.
  void _genai;
  // Reported attacks, quoted payloads and prompt-version tracing are design evidence.
  // Only imperative requests addressed to this interviewer trigger the attack filter.
  const text = content
    .trim()
    .replace(
      /^(?:(?:please|hey|hi)[,\s]+)*(?:(?:can|could|would|will)\s+you\s+)?/iu,
      "",
    );
  return (
    /^(?:(?:please|hey|hi)[,\s]+)?(?:(?:can|could|would|will)\s+you\s+)?(?:write|compose|generate|create|tell)\s+(?:(?:me|us|a|an|some|short|funny|little|the|beautiful|quick)\s+){0,6}(?:poem|poetry|song|story|joke|code|translation)\b/iu.test(
      text,
    ) ||
    /^(?:(?:please|can you|could you)\s+)?translate\b/iu.test(text) ||
    /^(?:ignore\b.{0,40}(?:instructions|rules)|(?:print|reveal|show)\b.{0,30}(?:system prompt|hidden instructions)|system\s*:|note to (?:the )?grader\b|give\b.{0,30}(?:4\/4|full credit))/iu.test(
      text,
    )
  );
}
