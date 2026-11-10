import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

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
  const version = isIP(ip);
  if (!version) return;
  let canonical = ip;
  if (version === 6) {
    try {
      canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    } catch {
      return;
    }
  }
  // Treat IPv4-mapped IPv6 and plain IPv4 as the same address.
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/u.exec(canonical);
  if (mapped) {
    const a = parseInt(mapped[1], 16),
      b = parseInt(mapped[2], 16);
    canonical = `${a >>> 8}.${a & 255}.${b >>> 8}.${b & 255}`;
  }
  const secret = process.env.VISITOR_IP_HASH_SECRET;
  if (!secret) return;
  return createHmac("sha256", secret)
    .update(`mockmeai/ip-visitor/v1:${canonical}`)
    .digest("hex");
}
