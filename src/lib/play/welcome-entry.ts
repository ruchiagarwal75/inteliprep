import "server-only";
import { cookies } from "next/headers";
import { HOME_INTRO_COOKIE, homeIntroSeen } from "./home-intro-preference";
import { welcomeRequired } from "./welcome-store";

/** Carry the browser's home intro preference into the verified account's onboarding. */
export async function welcomeRequiredForBrowser(userId: string) {
  const seen = homeIntroSeen((await cookies()).get(HOME_INTRO_COOKIE)?.value);
  return welcomeRequired(userId, seen);
}
