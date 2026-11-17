import "server-only";
import { createHmac } from "node:crypto";
import { canonicalIp } from "@/lib/ip-address";

export function visitorIpConfigured() {
  return (
    process.env.VERCEL === "1" &&
    (process.env.VISITOR_IP_HASH_SECRET?.length ?? 0) >= 32
  );
}

/** Collection requires the same configured secret as the scheduled cleanup. */
export function visitorIpRetentionSecret() {
  const secret = process.env.CRON_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

/** Server-only connection metadata. Never send raw addresses to a browser or logger. */
export function requestVisitorConnection(request: Request) {
  if (!visitorIpConfigured()) return;
  const ip = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!ip) return;
  const canonical = canonicalIp(ip);
  if (!canonical) return;
  const secret = process.env.VISITOR_IP_HASH_SECRET;
  if (!secret) return;
  const hash = createHmac("sha256", secret)
    .update(`mockmeai/ip-visitor/v1:${canonical}`)
    .digest("hex");
  const country = request.headers
    .get("x-vercel-ip-country")
    ?.trim()
    .toUpperCase();
  return {
    hash,
    rawIp: canonical,
    countryCode:
      country && /^[A-Z]{2}$/u.test(country) && !["XX", "ZZ"].includes(country)
        ? country
        : null,
  };
}

export type VisitorConnection = NonNullable<
  ReturnType<typeof requestVisitorConnection>
>;
