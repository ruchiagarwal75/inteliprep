/** Number of course topics available to guests, starting with Topic 0. */
export const GUEST_TOPIC_COUNT = 2;
export const GUEST_SIGN_IN_MESSAGE =
  "Sign in to save your XP and unlock the next topics.";

export function guestTopicAllowed(topic: string, level: number) {
  return (
    topic === "rag-course" &&
    Number.isInteger(level) &&
    level >= 0 &&
    level < GUEST_TOPIC_COUNT
  );
}

export function guestPageAllowed(path: string) {
  if (["/play", "/play/rag", "/play/rag/drill"].includes(path)) return true;
  const level = /^\/play\/rag\/topics\/(\d+)$/u.exec(path)?.[1];
  return level !== undefined && guestTopicAllowed("rag-course", Number(level));
}

export const GUEST_API_ROUTES: ReadonlySet<string> = new Set([
  "/api/play/activity",
  "/api/play/chest",
  "/api/play/next",
  "/api/play/profile",
  "/api/play/round",
  "/api/play/slides",
  "/api/play/submit",
  "/api/play/topic-rating",
  "/api/play/guest/prompt",
  "/api/play/guest/link",
]);
