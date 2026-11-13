/** Public product identity. Persistence and auth identifiers stay stable across rebrands. */
export const BRAND = {
  name: "Shardling",
  domain: "shardling.com",
  get url(): string {
    const origin = new URL(
      process.env.NEXT_PUBLIC_SITE_URL || `https://${this.domain}`,
    );
    if (
      !["https:", "http:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin");
    return origin.origin;
  },
  title: "Shardling: AI mock system design interviews",
  tagline: "Level up for the AI engineer interview.",
  pitch:
    "Train in 5-minute rounds, watch your readiness map fill in, then prove it in a real mock interview.",
  description:
    "Practice system design and AI/ML system design interviews with an AI interviewer, a whiteboard, and a scorecard.",
} as const;
