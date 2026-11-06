import { exactSentences } from "@/lib/exact-sentences";

/** Proposals request an acknowledgement rather than a canned reset to defaults. */
export function isCandidateProposal(content: string): boolean {
  return /(?:^|[.!?;:,]\s+)(?:(?:i|we)\s+(?:will|would|propose|suggest(?:ed)?|choose|plan to|intend to|assume|want to|prefer)|(?:i|we)['’](?:d|ll)\b|let['’]s\s+(?:use|keep|retain|store|target|assume|extend|change|set)|(?:can|could|may)\s+(?:i|we)\s+(?:use|keep|retain|store|target|assume|extend|change|set)|how about)\b/iu.test(
    content.trim(),
  );
}

/** Ordinary design narration must still leave the candidate's explanation uninterrupted. */
export function isRequirementProposal(content: string): boolean {
  return exactSentences(content).some((sentence) => {
    const requirement =
      /\b(requirements?|scope|retention|retain\w*|(?:keep|keeping|store|storing)\s+(?:the\s+)?(?:posts?|messages?|history|data)\s+(?:for\s+)?(?:\d+|one|two|three|a)|latency|response.time|traffic|quota|limit.policy|freshness|staleness|delet\w*|durability)\b/iu.test(
        sentence,
      );
    const negotiating =
      /\b(propose|suggest(?:ed)?|assume|prefer|want to|like to|how about|instead|rather than|(?:can|could|may)\s+(?:i|we))\b|let['’]s\b/iu.test(
        sentence,
      );
    const policyValue =
      /\b(?:keep|keeping|retain|retaining|store|storing)\s+(?:the\s+)?(?:posts?|messages?|history|data)\s+(?:for\s+)?(?:\d+|one|two|three|a)\b|\b(?:target|set|allow|limit)\b[^.!?]{0,60}\d|^(?:\d+|one|a)\s+year(?:s|[- ]long)?\b.*\bretention\b/iu.test(
        sentence,
      );
    return (
      (isCandidateProposal(sentence) ||
        /\b(propos\w*|suggest\w*|recommend\w*|instead of|rather than|we need|we can|we should)\b/iu.test(
          sentence,
        ) ||
        /^(?:keep|retain|store)\s+(?:the\s+)?(?:posts?|messages?|history|data)\b/iu.test(
          sentence,
        ) ||
        /^(?:\d+|one|a)\s+year(?:s|[- ]long)?\b.*\bretention\b/iu.test(
          sentence,
        )) &&
      requirement &&
      (negotiating || policyValue)
    );
  });
}
