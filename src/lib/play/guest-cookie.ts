import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { BetaUnavailableError } from "@/lib/beta-config";
import { authCookieOptions } from "@/lib/supabase-config";
export const GUEST_SESSION_COOKIE = "shardling-guest-session";
export const GUEST_LINK_COOKIE = "shardling-guest-link";
type Purpose = "session" | "link";
/** Do not copy the Auth cookie's name into another cookie's options. */
export function guestCookieOptions(maxAge: number) {
  const { path, sameSite, secure } = authCookieOptions();
  return { path, sameSite, secure, httpOnly: true, maxAge };
}
function signature(value: string, purpose: Purpose) {
  const secret = process.env.INTERVIEW_RESUME_SECRET;
  if (!secret && process.env.NODE_ENV !== "development")
    throw new BetaUnavailableError();
  return createHmac("sha256", secret ?? "guest-local-development-only")
    .update(`shardling-guest-${purpose}:${value}`)
    .digest("hex");
}
export function sealGuestCookie(
  id: string,
  purpose: Purpose,
  now = Date.now(),
) {
  const value = `${z.uuid().parse(id)}.${now}`;
  return `${value}.${signature(value, purpose)}`;
}
export function readGuestCookie(
  token: string | undefined,
  purpose: Purpose,
  now = Date.now(),
) {
  const parts = token?.split(".");
  if (!parts || parts.length !== 3 || !z.uuid().safeParse(parts[0]).success)
    return;
  const [id, issued, mac] = parts;
  const age = now - Number(issued);
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    age > (purpose === "link" ? 15 * 60_000 : 86_400_000) ||
    !/^[a-f0-9]{64}$/u.test(mac)
  )
    return;
  const expected = signature(`${id}.${issued}`, purpose);
  if (timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return id;
}
