/** Text-only notes and editor selection boxes are not architecture sketches. */
export function hasSketch(
  elements: readonly { type: string; isDeleted?: boolean }[] = [],
): boolean {
  return elements.some(
    (element) =>
      !element.isDeleted &&
      element.type !== "selection" &&
      element.type !== "text",
  );
}
