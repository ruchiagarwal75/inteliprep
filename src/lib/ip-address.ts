import { isIP } from "node:net";
/** Canonical full address for comparisons; never persist or log this value. */
export function canonicalIp(value: string): string | undefined {
  const version = isIP(value);
  if (!version) return;
  let result = value;
  try {
    if (version === 6)
      result = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  } catch {
    return;
  }
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/u.exec(result);
  if (mapped) {
    const a = parseInt(mapped[1], 16),
      b = parseInt(mapped[2], 16);
    result = `${a >>> 8}.${a & 255}.${b >>> 8}.${b & 255}`;
  }
  return result;
}
/** Anonymous quotas group IPv6 hosts from the same /64; account quotas are separate. */
export function anonymousIpNetwork(value: string): string | undefined {
  const ip = canonicalIp(value);
  if (!ip) return;
  if (isIP(ip) === 4) return ip;
  const [left, right] = ip.split("::"),
    a = left ? left.split(":") : [],
    b = right ? right.split(":") : [];
  const words =
    right === undefined
      ? a
      : [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
  return (
    words
      .slice(0, 4)
      .map((word) => word.padStart(4, "0"))
      .join(":") + "::/64"
  );
}
