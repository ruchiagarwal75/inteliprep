"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  authCookieOptions,
  requireSupabaseConfiguration,
} from "@/lib/supabase-config";

export function supabaseBrowser() {
  const { url, key } = requireSupabaseConfiguration();
  return createBrowserClient(url, key, {
    cookieOptions: authCookieOptions(),
  });
}
