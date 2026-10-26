import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { authFailureKind } from "@/lib/auth-failure";
import { logServerEvent } from "@/lib/server-events";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const requestId = randomUUID();
  let success = false;
  let cause: unknown;
  if (code) {
    try {
      const client = await supabaseServer(true);
      const { error } = await client.auth.exchangeCodeForSession(code);
      success = !error;
      cause = error;
    } catch (error) {
      cause = error;
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
        ? "/interview"
        : failure === "connection"
          ? "/sign-in?error=connection"
          : "/sign-in?error=1",
      request.url,
    ),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Request-Id", requestId);
  return response;
}
