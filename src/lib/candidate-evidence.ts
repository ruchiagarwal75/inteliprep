import type { ChatMessage } from "@/lib/chat";
import { isBareAcknowledgement } from "@/lib/requirements-reply";

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

export function isCandidateEvidence(message: ChatMessage): boolean {
  return (
    message.role === "user" &&
    message.source !== "control" &&
    message.content
      .split(/(?<=[.!?])\s+/u)
      .some((sentence) => sentence.trim() && !isPacingOnlyText(sentence))
  );
}
