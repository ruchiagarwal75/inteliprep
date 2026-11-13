import type { NextConfig } from "next";
import { BRAND } from "./brand";

/** Finish PKCE on the host that owns the verifier cookie, even after cutover. */
export function domainRedirects(): Awaited<
  ReturnType<NonNullable<NextConfig["redirects"]>>
> {
  const hosts = ["www.shardling.com"];
  if (process.env.MOCKMEAI_REDIRECT_ENABLED === "1")
    hosts.push("mockmeai.com", "www.mockmeai.com");
  return hosts.map((host) => ({
    source: "/:path((?!auth/callback(?:/|$)).*)",
    has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
    destination: `https://${BRAND.domain}/:path`,
    permanent: true,
  }));
}
