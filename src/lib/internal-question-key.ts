import { createHash } from "node:crypto";
export const QUESTION_KEY_PREFIX = "mmq7-";
/** Stable namespace for private identities. Patterns remain separate from keys. */
export function internalQuestionKey(key: string): string {
  if (!key || key.startsWith(QUESTION_KEY_PREFIX) || key.startsWith("fresh:"))
    return key;
  const suffix = /^[a-z\d_-]+$/iu.test(key)
    ? key
    : "topic-" + createHash("sha256").update(key).digest("hex").slice(0, 16);
  return QUESTION_KEY_PREFIX + suffix;
}
