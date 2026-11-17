import { expect, it } from "vitest";
import {
  guestPageAllowed,
  guestTopicAllowed,
  GUEST_API_ROUTES,
  GUEST_TOPIC_COUNT,
} from "./guest-policy";
import { withPlayGuest, requireGuestTopic } from "./guest-context";
it("opens only the configured free topics and required pages", () => {
  expect(GUEST_TOPIC_COUNT).toBe(2);
  for (const path of [
    "/play",
    "/play/rag",
    "/play/rag/drill",
    "/play/rag/topics/0",
    "/play/rag/topics/1",
  ])
    expect(guestPageAllowed(path)).toBe(true);
  for (const path of [
    "/play/rag/topics/2",
    "/play/rag/topics/10",
    "/play/rag/gap/permissions",
    "/play/welcome",
    "/play/chat",
    "/mock",
    "/interview/new",
    "/admin",
  ])
    expect(guestPageAllowed(path)).toBe(false);
  for (const level of [-1, 0.5, 2, NaN])
    expect(guestTopicAllowed("rag-course", level)).toBe(false);
  expect(guestTopicAllowed("rag", 0)).toBe(false);
});
it("guests cannot opt into paid APIs through the Play adapter", () => {
  for (const path of [
    "/api/chat",
    "/api/interview/start",
    "/api/interview/end",
    "/api/play/prompt",
    "/api/play/boss/cleared",
    "/api/play/welcome",
  ])
    expect(GUEST_API_ROUTES.has(path)).toBe(false);
});
it("checks guest scope in a request-local context without restricting real accounts", () => {
  withPlayGuest(true, () => {
    expect(() => requireGuestTopic("rag-course", 1)).not.toThrow();
    expect(() => requireGuestTopic("rag-course", 2)).toThrow(/Sign in/);
  });
  expect(() => requireGuestTopic("rag-course", 2)).not.toThrow();
});
