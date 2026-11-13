import type { Locator } from "@playwright/test";
/** Check rendered font boxes against each other and the actual stroked shape paths. */
export async function svgClearance(svg: Locator) {
  return svg.evaluate((node) => {
    if (!(node instanceof SVGSVGElement)) throw Error("Expected SVG");
    const labels = Array.from(node.querySelectorAll("text"), (t) => ({
      node: t,
      name: t.textContent ?? "",
      box: t.getBoundingClientRect(),
    }));
    const borders = Array.from(
      node.querySelectorAll("rect,path[data-diagram-box]"),
    ).flatMap((shape) => {
      if (!(shape instanceof SVGGeometryElement)) return [];
      const matrix = shape.getScreenCTM();
      if (!matrix) throw Error("Missing shape transform");
      const length = shape.getTotalLength(),
        count = Math.ceil(length * 2);
      return [
        {
          box: shape.getBoundingClientRect(),
          points: Array.from({ length: count + 1 }, (_, i) => {
            const local = shape.getPointAtLength((length * i) / count);
            return new DOMPoint(local.x, local.y).matrixTransform(matrix);
          }),
        },
      ];
    });
    const overlap = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.25 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.25;
    const failures: string[] = [];
    for (const [i, label] of labels.entries()) {
      for (const other of labels.slice(i + 1))
        if (overlap(label.box, other.box))
          failures.push(`Text overlap: ${label.name} / ${other.name}`);
      for (const border of borders) {
        const a = label.box;
        if (
          border.points.some(
            (p) =>
              p.x > a.left - 1 &&
              p.x < a.right + 1 &&
              p.y > a.top - 1 &&
              p.y < a.bottom + 1,
          )
        )
          failures.push(`Text touches box border: ${label.name}`);
        if (label.node.hasAttribute("data-step-label")) {
          const b = border.box,
            dx = Math.max(a.left - b.right, b.left - a.right, 0),
            dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
          if (Math.hypot(dx, dy) < 8)
            failures.push(
              `Step label has less than 8px clearance: ${label.name}`,
            );
        }
      }
    }
    const route = (name: string) => {
      const path = node.querySelector(
        `[data-serving-connection="${name}"] path`,
      );
      if (!(path instanceof SVGPathElement)) return [];
      const matrix = path.getScreenCTM();
      if (!matrix) throw Error("Missing route transform");
      const length = path.getTotalLength(),
        count = Math.ceil(length * 2);
      return Array.from({ length: count + 1 }, (_, i) => {
        const p = path.getPointAtLength((length * i) / count);
        return new DOMPoint(p.x, p.y).matrixTransform(matrix);
      });
    };
    const ingestion = route("ingestion");
    for (const name of ["generation", "return"])
      if (
        route(name).some((a) =>
          ingestion.some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 1),
        )
      )
        failures.push(`Ingestion crosses ${name}`);
    return failures;
  });
}
