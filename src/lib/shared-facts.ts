/** Compare trusted service facts across equivalent numeric/unit wording. */
export function normalizeSharedFacts(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d),(\d)/gu, "$1$2")
    .replace(
      /\b(\d+(?:\.\d+)?)\s*(thousand|million|billion|k|m|b)\b/gu,
      (_, n: string, unit: string) =>
        String(
          Number(n) *
            ({
              k: 1e3,
              thousand: 1e3,
              m: 1e6,
              million: 1e6,
              b: 1e9,
              billion: 1e9,
            }[unit] ?? 1),
        ),
    )
    .replace(
      /\b(\d+(?:\.\d+)?)\s*(milliseconds?|msecs?|ms|seconds?|secs?|s)\b/gu,
      (_, n: string, unit: string) =>
        String(Number(n) * (unit.startsWith("s") ? 1000 : 1)) + "ms",
    );
}
