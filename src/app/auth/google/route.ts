import { cookies } from "next/headers";
import { z } from "zod";
import { ApiRequestError, readJsonBody } from "@/lib/api-request";
import { oauthCallbackUrl } from "@/lib/oauth-callback";
import { GUEST_LINK_COOKIE } from "@/lib/play/guest-cookie";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const headers = { "Cache-Control": "private, no-store" };
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json(
      { error: "Same-origin request required." },
      { status: 403, headers },
    );
  try {
    const input = z
      .strictObject({ next: z.literal("/admin").optional() })
      .safeParse(await readJsonBody(request, 256));
    if (!input.success)
      return Response.json(
        { error: "Invalid sign-in request." },
        { status: 400, headers },
      );
    const client = await supabaseServer(true);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthCallbackUrl(origin, input.data.next),
        scopes: "openid email profile",
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw Error("Google sign-in unavailable");
    // A previous guest-link attempt must not reject a normal account sign-in.
    // Keep the guest's auth session intact until OAuth completes successfully.
    (await cookies()).delete(GUEST_LINK_COOKIE);
    return Response.json({ url: data.url }, { headers });
  } catch (cause) {
    return Response.json(
      { error: "Google sign-in is temporarily unavailable. Please retry." },
      {
        status: cause instanceof ApiRequestError ? cause.status : 503,
        headers,
      },
    );
  }
}
