/** Public product identity. Persistence and auth identifiers stay stable across rebrands. */
export const BRAND = {
  name: "MockMeAI",
  domain: "mockmeai.com",
  get url(): string {
    return `https://${this.domain}`;
  },
  tagline: "Level up for the AI engineer interview.",
  pitch:
    "Train in 5-minute rounds, watch your readiness map fill in, then prove it in a real mock interview.",
  description:
    "Practice AI engineer system design in short drills and full mock interviews.",
} as const;
