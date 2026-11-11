export const GENAI_CAPACITY =
  /\b(?:feed requests?|ad requests?|impressions?|item scores?|predictions?|click volume|clicks?|tokens?|gpus?|gpu throughput|embeddings?|vectors?|index size|chunks?|context window|cost|model rate limits?|input|output|per request|per task|per minute|memory|ram|disk|storage|bandwidth)\b/iu;
export function isGenaiEstimate(text: string) {
  return (
    /\d/u.test(text) &&
    GENAI_CAPACITY.test(text) &&
    (!/[?？]\s*$/u.test(text) ||
      /^i\s+(?:estimate|calculate|assume|get|redid|recalculated)\b/iu.test(
        text.trim(),
      )) &&
    /\b(?:estimat\w*|calculat\w*|assum\w*|roughly|about|need\w*|requires?|therefore|so|i get|works? out)\b/iu.test(
      text,
    )
  );
}
