/** Presentation preference only. Never grants account access or learning progress. */
export const HOME_INTRO_COOKIE = "shardling-home-intro";
export const HOME_INTRO_SEEN = "v1";
export function homeIntroSeen(value: string | undefined) {
  return value === HOME_INTRO_SEEN;
}
