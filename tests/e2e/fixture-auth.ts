import type { BrowserContext } from "@playwright/test";
import { topicRatingKey } from "../../src/lib/play/topic-rating-public";
export async function signIn(
  context: BrowserContext,
  account = "invited",
  options: { firstTopicRating?: boolean } = {},
) {
  const response = await context.request.get(
    `https://127.0.0.1:4444/fixture/session?account=${account}`,
  );
  const session = await response.json();
  // Unrelated stories model an already-dismissed prompt. Dedicated rating stories
  // leave it fresh and exercise the real server eligibility and persistence.
  if (!options.firstTopicRating)
    await context.addInitScript((key) => {
      try {
        localStorage.setItem(key, "handled");
      } catch {
        /* Blocked storage is valid. */
      }
    }, topicRatingKey(session.user.id));
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
