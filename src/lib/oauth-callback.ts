/** Always return OAuth to the browser's host, independent of the canonical site URL. */
export function oauthCallbackUrl(origin: string, returnTo?: "/admin"): string {
  const callback = new URL("/auth/callback", origin);
  if (returnTo) callback.searchParams.set("next", returnTo);
  return callback.href;
}
