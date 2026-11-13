import type { NextConfig } from "next";
import { BRAND } from "./brand";

/** Finish PKCE on the host that owns the verifier cookie, even after cutover. */
export function domainRedirects(): Awaited<
  ReturnType<NonNullable<NextConfig["redirects"]>>
> {
  const hosts = [`www.${BRAND.domain}`];
  return hosts.map((host) => ({
    source: "/:path((?!auth/callback(?:/|$)).*)",
    has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
    destination: `https://${BRAND.domain}/:path`,
    permanent: true,
  }));
}
