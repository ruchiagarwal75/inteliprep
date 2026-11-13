import { beforeEach, expect, it, vi } from "vitest";
import { POST as start } from "@/app/api/play/welcome/start/route";
import { POST as finish } from "@/app/api/play/welcome/route";
import { requireCandidateIdentity } from "@/lib/candidate-auth";
import { CandidateAuthError } from "@/lib/supabase-config";
import { CandidateInviteError } from "@/lib/candidate-invites";
import { PlayError } from "@/lib/play/errors";
const { open, save } = vi.hoisted(() => ({ open: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/play/welcome-store", () => ({
  openWelcome: open,
  finishWelcome: save,
}));
const id = crypto.randomUUID();
const request = (path: string, body: unknown, origin = "http://localhost") =>
  new Request(`http://localhost/api/play/welcome${path}`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  open.mockReset().mockResolvedValue(id);
  save.mockReset().mockResolvedValue(undefined);
});
it("guards intro commands with sign-in, invitation and same-origin checks", async () => {
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateAuthError(),
  );
  expect(
    (await start(request("/start", { requestId: id, replay: false }))).status,
  ).toBe(401);
  vi.mocked(requireCandidateIdentity).mockRejectedValueOnce(
    new CandidateInviteError(),
  );
  expect(
    (await finish(request("", { runId: id, action: "skip", panel: 1 }))).status,
  ).toBe(403);
  expect(
    (
      await start(
        request(
          "/start",
          { requestId: id, replay: false },
          "https://unrelated.invalid",
        ),
      )
    ).status,
  ).toBe(403);
  expect(open).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});
it("accepts bounded strict commands only for the verified account", async () => {
  expect(
    (
      await start(
        request("/start", { requestId: id, replay: true, userId: id }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await finish(request("", { runId: id, action: "complete", panel: 2 })))
      .status,
  ).toBe(400);
  expect(
    (await start(request("/start", { text: "x".repeat(2500) }))).status,
  ).toBe(413);
  expect(
    (await start(request("/start", { requestId: id, replay: true }))).status,
  ).toBe(200);
  expect(open).toHaveBeenCalledExactlyOnceWith(
    "11111111-1111-4111-8111-111111111111",
    true,
    id,
  );
  save.mockRejectedValueOnce(
    new PlayError("This intro is unavailable. Please reopen it.", 404),
  );
  expect(
    (await finish(request("", { runId: id, action: "skip", panel: 1 }))).status,
  ).toBe(404);
});
