export type ThemeColor = "--canvas-background" | "--diagram-export-background";
/** Canvas APIs need a resolved CSS color, rather than an unresolved var() string. */
export function themeColor(token: ThemeColor) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!value)
    throw new Error(
      "The whiteboard colors couldn't load. Please reload the page.",
    );
  return value;
}
