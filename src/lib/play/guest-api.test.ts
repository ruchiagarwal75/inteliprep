import { beforeEach, expect, it, vi } from "vitest";
import {
  candidateSession,
  requireCandidateIdentity,
} from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { withApiRequest } from "@/lib/api-request";
import { playEndpoint } from "./api";
import { currentPlayGuest, requireGuestTopic } from "./guest-context";
import { REQUEST_LIMITS } from "@/lib/request-limits";
const id = "11111111-1111-4111-8111-111111111111";
const request = (path: string) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { origin: "http://localhost", "Content-Type": "application/json" },
    body: "{}",
  });
beforeEach(() => {
  vi.mocked(candidateSession).mockResolvedValue({ id, kind: "guest" });
  vi.mocked(requireCandidateIdentity).mockRejectedValue(
    new CandidateAuthError(),
  );
});
it.each([
  "/api/chat",
  "/api/interview/start",
  "/api/interview/end",
  "/api/interview/resume",
  "/api/play/prompt",
  "/api/play/boss/cleared",
  "/api/play/welcome",
])("denies anonymous access to %s before its handler", async (route) => {
  const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  const api = withApiRequest("play", route, handler, { allowPlayGuest: true });
  expect((await api(request(route))).status).toBe(401);
  expect(handler).not.toHaveBeenCalled();
});
it("allows a free guest action but enforces topic boundaries and rate limits", async () => {
  const api = playEndpoint("/api/play/round", async () => {
    expect(currentPlayGuest()).toBe(true);
    requireGuestTopic("rag-course", 1);
    return Response.json({ ok: true });
  });
  for (let i = 0; i < REQUEST_LIMITS.guestPlay[0]; i++)
    expect((await api(request("/api/play/round"))).status).toBe(200);
  const limited = await api(request("/api/play/round"));
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
});
it("returns a sign-in destination when a guest forges a later topic", async () => {
  const api = playEndpoint("/api/play/slides", async () => {
    requireGuestTopic("rag-course", 2);
    return Response.json({ ok: true });
  });
  const r = await api(request("/api/play/slides"));
  expect(r.status).toBe(403);
  expect(await r.json()).toMatchObject({
    code: "GUEST_SIGN_IN_REQUIRED",
    signInUrl: "/sign-in?guest=limit",
  });
});
