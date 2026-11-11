import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { pageContentSecurityPolicy } from "@/lib/security-headers";
import {
  authCookieOptions,
  supabaseConfiguration,
} from "@/lib/supabase-config";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = pageContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const config = supabaseConfiguration();
  if (
    config &&
    /^\/(?:interview|play|progress|mock|admin|sign-in|auth|api\/(?:admin|interview|chat|play))(?:\/|$)/u.test(
      request.nextUrl.pathname,
    )
  ) {
    const client = createServerClient(config.url, config.key, {
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, AbortSignal.timeout(8_000)])
              : AbortSignal.timeout(8_000),
          }),
      },
      cookieOptions: authCookieOptions(),
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(changes, headers) {
          for (const { name, value } of changes)
            request.cookies.set(name, value);
          requestHeaders.set("cookie", request.cookies.toString());
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of changes)
            response.cookies.set(name, value, options);
          for (const [name, value] of Object.entries(headers ?? {}))
            response.headers.set(name, value);
        },
      },
    });
    // Pages and handlers make their own authorization checks close to the data.
    try {
      await client.auth.getClaims();
    } catch {
      /* Handlers fail closed. */
    }
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/api/interview/:path*",
    "/api/chat",
    "/api/play/:path*",
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|fonts/|practice-guide/).*)",
  ],
};
