import { z } from "zod";
import { cookies } from "next/headers";
import { playEndpoint } from "@/lib/play/api";
import { readJsonBody, ApiRequestError } from "@/lib/api-request";
import { currentPlayGuest } from "@/lib/play/guest-context";
import { supabaseServer } from "@/lib/supabase-server";
import { oauthCallbackUrl } from "@/lib/oauth-callback";
import {
  GUEST_LINK_COOKIE,
  sealGuestCookie,
  guestCookieOptions,
} from "@/lib/play/guest-cookie";
export const POST = playEndpoint(
  "/api/play/guest/link",
  async (request, userId) => {
    if (!currentPlayGuest())
      throw new ApiRequestError("Sign in with Google to continue.", 400);
    if (
      !z.strictObject({}).safeParse(await readJsonBody(request, 1024)).success
    )
      throw new ApiRequestError("Please retry linking your account.", 400);
    const client = await supabaseServer(true);
    const { data: fresh, error: invalid } = await client.auth.getUser();
    if (invalid || fresh.user?.id !== userId || !fresh.user.is_anonymous)
      throw new ApiRequestError(
        "Please reopen Play before linking your account.",
        401,
      );
    const { data, error } = await client.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: oauthCallbackUrl(new URL(request.url).origin),
        scopes: "openid email profile",
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url)
      throw new ApiRequestError(
        "Google linking is unavailable. Your guest progress is safe.",
        503,
      );
    (await cookies()).set(
      GUEST_LINK_COOKIE,
      sealGuestCookie(userId, "link"),
      guestCookieOptions(900),
    );
    return Response.json({ url: data.url });
  },
);
