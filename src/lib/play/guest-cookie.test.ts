import { expect, it } from "vitest";
import { sealGuestCookie, readGuestCookie } from "./guest-cookie";
const id = "11111111-1111-4111-8111-111111111111";
it("verifies purpose, signature, expiry and clock before trusting guest state", () => {
  const now = 100000000,
    token = sealGuestCookie(id, "link", now);
  expect(readGuestCookie(token, "link", now + 1000)).toBe(id);
  expect(readGuestCookie(token, "session", now)).toBeUndefined();
  expect(
    readGuestCookie(
      token.replace(id, "22222222-2222-4222-8222-222222222222"),
      "link",
      now,
    ),
  ).toBeUndefined();
  expect(readGuestCookie(token, "link", now + 900001)).toBeUndefined();
  expect(readGuestCookie(token, "link", now - 1)).toBeUndefined();
  for (const bad of [undefined, "", "forged", "a.b.c"])
    expect(readGuestCookie(bad, "link", now)).toBeUndefined();
  const session = sealGuestCookie(id, "session", now);
  expect(readGuestCookie(session, "session", now + 86400000)).toBe(id);
  expect(readGuestCookie(session, "session", now + 86400001)).toBeUndefined();
});

it("keeps guest tracking and linking cookies separate from the Auth cookie", async () => {
  const { NextResponse } = await import("next/server");
  const { guestCookieOptions, GUEST_SESSION_COOKIE, GUEST_LINK_COOKIE } =
    await import("./guest-cookie");
  const response = NextResponse.json({ ok: true });
  response.cookies.set("inteliprep-auth", "original-session");
  response.cookies.set(
    GUEST_SESSION_COOKIE,
    "signed-session",
    guestCookieOptions(86400),
  );
  response.cookies.set(
    GUEST_LINK_COOKIE,
    "signed-link",
    guestCookieOptions(900),
  );
  expect(response.cookies.get("inteliprep-auth")?.value).toBe(
    "original-session",
  );
  expect(response.cookies.get(GUEST_SESSION_COOKIE)).toMatchObject({
    value: "signed-session",
    httpOnly: true,
  });
  expect(response.cookies.get(GUEST_LINK_COOKIE)).toMatchObject({
    value: "signed-link",
    httpOnly: true,
  });
  expect(guestCookieOptions(900)).not.toHaveProperty("name");
});
