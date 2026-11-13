import { afterEach, expect, it, vi } from "vitest";
import { approvalEmailPayload, sendApprovalEmail } from "@/lib/approval-email";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("sends a fixed approval template from the verified brand with a stable retry key", async () => {
  vi.stubEnv("RESEND_API_KEY", "fixture-key-never-real");
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: "email-123" }));
  vi.stubGlobal("fetch", fetch);
  const payload = approvalEmailPayload("person@example.test");
  await expect(sendApprovalEmail("notification-123", payload)).resolves.toBe(
    "email-123",
  );
  expect(fetch).toHaveBeenCalledWith(
    "https://api.resend.com/emails",
    expect.objectContaining({
      redirect: "error",
      body: JSON.stringify(payload),
      headers: expect.objectContaining({
        "Idempotency-Key": "mockmeai-approval/notification-123",
      }),
      signal: expect.any(AbortSignal),
    }),
  );
  expect(payload.from).toBe("Shardling <hello@shardling.com>");
  expect(payload.text).toContain("https://shardling.com");
  expect(payload.text).toContain("person@example.test");
});

it("rejects missing configuration without contacting the provider", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    sendApprovalEmail("id", approvalEmailPayload("person@example.test")),
  ).rejects.toMatchObject({ category: "configuration" });
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  [401, "provider_authentication"],
  [403, "provider_authentication"],
  [429, "provider_limit"],
  [503, "provider_unavailable"],
  [422, "provider_request"],
])(
  "classifies %s without exposing its error body",
  async (status, category) => {
    vi.stubEnv("RESEND_API_KEY", "private-key");
    const response = new Response("private-recipient private-key", {
      status: Number(status),
    });
    const read = vi.spyOn(response, "json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(
      sendApprovalEmail("id", approvalEmailPayload("person@example.test")),
    ).rejects.toMatchObject({
      category,
      message: "Approval email could not be confirmed.",
    });
    expect(read).toHaveBeenCalledTimes(status === 403 ? 1 : 0);
  },
);

it("distinguishes an unverified sending domain without exposing provider details", async () => {
  vi.stubEnv("RESEND_API_KEY", "private-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          name: "validation_error",
          message:
            "The shardling.com domain is not verified. Please, add and verify your domain. private-recipient private-key",
        },
        { status: 403 },
      ),
    ),
  );
  await expect(
    sendApprovalEmail("id", approvalEmailPayload("person@example.test")),
  ).rejects.toMatchObject({
    category: "sender_domain_unverified",
    status: 403,
    message: "Approval email could not be confirmed.",
  });
});

it("keeps unrelated permission errors distinct from domain verification", async () => {
  vi.stubEnv("RESEND_API_KEY", "private-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          name: "restricted_api_key",
          message: "private-key private-recipient",
        },
        { status: 403 },
      ),
    ),
  );
  await expect(
    sendApprovalEmail("id", approvalEmailPayload("person@example.test")),
  ).rejects.toMatchObject({
    category: "provider_authentication",
    message: "Approval email could not be confirmed.",
  });
});

it("treats a lost response as unconfirmed and keeps credentials out of errors", async () => {
  vi.stubEnv("RESEND_API_KEY", "private-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(Error("private-key private-recipient")),
  );
  await expect(
    sendApprovalEmail("id", approvalEmailPayload("person@example.test")),
  ).rejects.toMatchObject({
    category: "network_or_timeout",
    message: "Approval email could not be confirmed.",
  });
});

it("does not mark a malformed success as sent", async () => {
  vi.stubEnv("RESEND_API_KEY", "fixture-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ unexpected: "value" })),
  );
  await expect(
    sendApprovalEmail("id", approvalEmailPayload("person@example.test")),
  ).rejects.toMatchObject({ category: "provider_response" });
});
