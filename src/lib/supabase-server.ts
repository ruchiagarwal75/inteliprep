import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  authCookieOptions,
  requireSupabaseConfiguration,
} from "@/lib/supabase-config";

export async function supabaseServer(writable = false) {
  const { url, key } = requireSupabaseConfiguration();
  const jar = await cookies();
  return createServerClient(url, key, {
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
      getAll: () => jar.getAll(),
      setAll(changes) {
        // Proxy refreshes cookies before Server Component rendering.
        if (writable)
          for (const { name, value, options } of changes)
            jar.set(name, value, options);
      },
    },
  });
}
