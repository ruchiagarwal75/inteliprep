import { observeAccountAccess } from "@/lib/account-onboarding";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase-config";
import { GUEST_LINK_COOKIE, readGuestCookie } from "@/lib/play/guest-cookie";
import { recordGuestUpgrade } from "@/lib/play/guest-events";
import { supabaseServer } from "@/lib/supabase-server";
import { authFailureKind } from "@/lib/auth-failure";
import { logServerEvent } from "@/lib/server-events";
import {
  CandidateInviteError,
  requireCandidateInvite,
} from "@/lib/candidate-invites";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const returnTo = params.get("next") === "/admin" ? "/admin" : "/play";
  const requestId = randomUUID();
  const jar = await cookies();
  const linkToken = jar.get(GUEST_LINK_COOKIE)?.value;
  const guestId = readGuestCookie(linkToken, "link");
  const authOptions = authCookieOptions();
  const originalGuestCookies = linkToken
    ? jar.getAll().filter((cookie) => cookie.name.startsWith(authOptions.name))
    : [];
  let success = false;
  let invited = true;
  let cause: unknown;
  if (code) {
    try {
      const client = await supabaseServer(true);
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      success =
        !error &&
        Boolean(data?.user) &&
        !data.user?.is_anonymous &&
        (!linkToken || data.user?.id === guestId);
      cause = error;
      if (success && data?.user) {
        if (guestId) await recordGuestUpgrade(guestId).catch(() => {});
        try {
          await requireCandidateInvite(data.user.id, data.user.email, client);
          observeAccountAccess(data.user.id, data.user.email);
        } catch (failure) {
          if (!(failure instanceof CandidateInviteError)) throw failure;
          invited = false;
        }
      }
    } catch (error) {
      cause = error;
      success = false;
    }
  }
  if (linkToken) {
    if (!success) {
      for (const cookie of jar.getAll())
        if (cookie.name.startsWith(authOptions.name)) jar.delete(cookie.name);
      for (const cookie of originalGuestCookies)
        jar.set(cookie.name, cookie.value, {
          path: authOptions.path,
          sameSite: authOptions.sameSite,
          secure: authOptions.secure,
        });
    }
    jar.delete(GUEST_LINK_COOKIE);
  }
  const failure = authFailureKind(cause);
  if (code && !success) {
    logServerEvent(
      {
        event: "api_failure",
        route: "/auth/callback",
        requestId,
        status: failure === "connection" ? 503 : 400,
        kind: `auth_exchange_${failure}`,
      },
      cause,
    );
  }
  // Fixed same-origin destinations avoid accepting an external return URL.
  const response = NextResponse.redirect(
    new URL(
      success
        ? invited
          ? returnTo
          : "/not-invited"
        : linkToken
          ? `/sign-in?guest=1&error=${["identity_already_exists", "email_exists", "user_already_exists"].includes(params.get("error_code") ?? "") ? "link_exists" : "link_failed"}`
          : failure === "connection"
            ? "/sign-in?error=connection"
            : "/sign-in?error=1",
      request.url,
    ),
  );
  if (!success && returnTo === "/admin") {
    const destination = new URL(
      response.headers.get("Location") ?? "/sign-in",
      request.url,
    );
    destination.searchParams.set("next", "/admin");
    response.headers.set("Location", destination.href);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Request-Id", requestId);
  return response;
}
