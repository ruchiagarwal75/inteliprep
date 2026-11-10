import "server-only";
import { createHmac } from "node:crypto";
import { canonicalIp } from "@/lib/ip-address";

export function visitorIpConfigured() {
  return (
    process.env.VERCEL === "1" &&
    (process.env.VISITOR_IP_HASH_SECRET?.length ?? 0) >= 32
  );
}

/** Only the platform-supplied address is trusted. Never return or log the raw IP. */
export function requestVisitorIpHash(request: Request): string | undefined {
  if (!visitorIpConfigured()) return;
  const ip = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!ip) return;
  const canonical = canonicalIp(ip);
  if (!canonical) return;
  const secret = process.env.VISITOR_IP_HASH_SECRET;
  if (!secret) return;
  return createHmac("sha256", secret)
    .update(`mockmeai/ip-visitor/v1:${canonical}`)
    .digest("hex");
}
