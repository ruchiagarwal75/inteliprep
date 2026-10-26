import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  authCookieOptions,
  supabaseConfiguration,
} from "@/lib/supabase-config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfiguration();
  if (config) {
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
          response = NextResponse.next({ request });
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
  return response;
}

export const config = {
  matcher: [
    "/interview/:path*",
    "/sign-in/:path*",
    "/auth/:path*",
    "/api/interview/:path*",
    "/api/chat",
  ],
};
