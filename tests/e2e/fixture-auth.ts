import type { BrowserContext } from "@playwright/test";
export async function signIn(context: BrowserContext, account = "invited") {
  const response = await context.request.get(
    `https://127.0.0.1:4444/fixture/session?account=${account}`,
  );
  const session = await response.json();
  await context.addCookies([
    {
      name: "inteliprep-auth",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      url: "http://localhost:3100",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
}
