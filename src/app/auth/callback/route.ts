import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
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
  const returnTo = params.get("next") === "/admin" ? "/admin" : "/interview";
  const requestId = randomUUID();
  let success = false;
  let invited = true;
  let cause: unknown;
  if (code) {
    try {
      const client = await supabaseServer(true);
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      success = !error;
      cause = error;
      if (success && data?.user) {
        try {
          await requireCandidateInvite(data.user.id, data.user.email, client);
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
