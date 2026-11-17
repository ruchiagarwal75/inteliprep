import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  withApiRequest,
  readJsonBody,
  ApiRequestError,
} from "@/lib/api-request";
import { withCandidateIdentity } from "@/lib/candidate-context";
import { checkRequestLimit } from "@/lib/request-limits";
import {
  GUEST_SESSION_COOKIE,
  readGuestCookie,
  sealGuestCookie,
  guestCookieOptions,
} from "@/lib/play/guest-cookie";

/** Browser-side Auth sees the visitor IP, rather than our shared function IP. */
export const POST = withApiRequest(
  "guestStart",
  "/api/play/guest",
  async (request) => {
    if (
      !z.strictObject({}).safeParse(await readJsonBody(request, 1024)).success
    )
      throw new ApiRequestError("Please retry opening Play.", 400);
    const jar = await cookies();
    const session =
      readGuestCookie(jar.get(GUEST_SESSION_COOKIE)?.value, "session") ??
      randomUUID();
    const retry = await withCandidateIdentity(session, () =>
      checkRequestLimit(request, "guestSession"),
    );
    jar.set(
      GUEST_SESSION_COOKIE,
      sealGuestCookie(session, "session"),
      guestCookieOptions(86400),
    );
    return retry
      ? Response.json(
          { error: "Please wait before starting another guest session." },
          { status: 429, headers: { "Retry-After": String(retry) } },
        )
      : Response.json({ ready: true });
  },
);
