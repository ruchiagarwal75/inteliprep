import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "This request must come from the interview site" },
      { status: 403 },
    );
  try {
    const client = await supabaseServer(true);
    await client.auth.signOut({ scope: "local" });
  } catch {
    /* Always clear this browser's auth cookies, even during an outage. */
  }
  const jar = await cookies();
  for (const { name } of jar.getAll())
    if (name === "inteliprep-auth" || name.startsWith("inteliprep-auth."))
      jar.delete(name);
  const response = NextResponse.json({ signedOut: true });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
