import type { ChatMessage } from "@/lib/chat";
import { isBareAcknowledgement } from "@/lib/requirements-reply";
import { exactSentences } from "@/lib/exact-sentences";

/** Recognize legacy controls too, without stripping real explanations sent in the same message. */
export function isPacingOnlyText(content: string): boolean {
  const text = content.trim().replaceAll("’", "'");
  return (
    isBareAcknowledgement(text) ||
    /^(?:hello|hi|hey|done|ready|please let me finish(?: before asking questions)?|(?:i've|i have|i'm|i am) (?:finished|done|still|not done) (?:explaining|drawing)|(?:i'm|i am) ready to explain (?:my|the) (?:design|drawing)|let's discuss(?: my design)?|please (?:hold|pause) questions(?: while i draw)?|(?:i'd|i would) like time to work on my drawing|(?:i'll|i will) explain now)[.!\s]*$/iu.test(
      text,
    )
  );
}

/** Keep exact excerpts separate so removing controls cannot fabricate a contiguous quote. */
export function candidateEvidenceExcerpts(message: ChatMessage): string[] {
  if (message.role !== "user" || message.source === "control") return [];
  return exactSentences(message.content).filter(
    (sentence) => !isPacingOnlyText(sentence),
  );
}

export function isCandidateEvidence(message: ChatMessage): boolean {
  return candidateEvidenceExcerpts(message).length > 0;
}
