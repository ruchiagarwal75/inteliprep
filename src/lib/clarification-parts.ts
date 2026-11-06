/** Keep separately asked clarifications visible to both routing and the model. */
export function clarificationParts(content: string): string[] {
  return content
    .split(
      /[?？;]\s*|,\s*(?:and\s+)?(?=(?:what|how|which|when|where|who|is|are|do|does|can|could|should)\b)|\band\s+(?=(?:what|how|which|when|where|who|is|are|do|does|can|could|should)\b)/iu,
    )
    .map((part) => part.trim())
    .filter(Boolean);
}
