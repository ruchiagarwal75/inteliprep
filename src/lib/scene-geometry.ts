import type { SceneArrow, SceneComponent, SceneText } from "@/lib/scene";

type Point = readonly [number, number];
const MAX_ENDPOINT_DISTANCE = 24;
const MIN_DISTANCE_MARGIN = 12;

function rotate([x, y]: Point, [cx, cy]: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    cx + (x - cx) * cos - (y - cy) * sin,
    cy + (x - cx) * sin + (y - cy) * cos,
  ];
}

function segmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
              lengthSquared,
          ),
        );
  return Math.hypot(point[0] - start[0] - t * dx, point[1] - start[1] - t * dy);
}

function shapeDistance(point: Point, shape: SceneComponent): number {
  const rx = shape.width / 2;
  const ry = shape.height / 2;
  if (!rx || !ry) return Infinity;
  const center: Point = [shape.x + rx, shape.y + ry];
  const local = rotate(point, center, -shape.angle);
  const dx = local[0] - center[0];
  const dy = local[1] - center[1];

  if (shape.type === "ellipse") {
    if (Math.hypot(dx / rx, dy / ry) <= 1) return 0;
    // Radial distance is conservative: avoid inventing an ambiguous binding.
    const angle = Math.atan2(dy / ry, dx / rx);
    return Math.hypot(dx - rx * Math.cos(angle), dy - ry * Math.sin(angle));
  }
  if (shape.type === "diamond") {
    if (Math.abs(dx) / rx + Math.abs(dy) / ry <= 1) return 0;
    const vertices: Point[] = [
      [0, -ry],
      [rx, 0],
      [0, ry],
      [-rx, 0],
    ];
    return Math.min(
      ...vertices.map((vertex, index) =>
        segmentDistance(
          [dx, dy],
          vertex,
          vertices[(index + 1) % vertices.length],
        ),
      ),
    );
  }
  return Math.hypot(
    Math.max(0, Math.abs(dx) - rx),
    Math.max(0, Math.abs(dy) - ry),
  );
}

/** Resolve an unsnapped endpoint only when one nearby component clearly wins. */
export function inferArrowEndpoint(
  arrow: SceneArrow,
  end: "start" | "end",
  components: readonly SceneComponent[],
): string | undefined {
  const point = end === "start" ? arrow.points[0] : arrow.points.at(-1);
  if (!point) return undefined;
  // Linear element points can extend left/up from their origin.
  const xs = arrow.points.map(([x]) => x);
  const ys = arrow.points.map(([, y]) => y);
  const globalPoint = rotate(
    [arrow.x + point[0], arrow.y + point[1]],
    [
      arrow.x + (Math.min(...xs) + Math.max(...xs)) / 2,
      arrow.y + (Math.min(...ys) + Math.max(...ys)) / 2,
    ],
    arrow.angle,
  );
  const candidates = components
    .filter((component) => !component.isDeleted)
    .map((component) => ({
      id: component.id,
      distance: shapeDistance(globalPoint, component),
    }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0];
  if (!nearest || nearest.distance > MAX_ENDPOINT_DISTANCE) return undefined;
  const runnerUp = candidates[1];
  if (runnerUp && runnerUp.distance - nearest.distance < MIN_DISTANCE_MARGIN)
    return undefined;
  return nearest.id;
}

/** An unbound label must fit entirely inside exactly one live component. */
export function inferTextContainer(
  text: SceneText,
  components: readonly SceneComponent[],
): string | undefined {
  if (
    text.isDeleted ||
    text.containerId ||
    !text.text.trim() ||
    !text.width ||
    !text.height
  )
    return undefined;
  const center: Point = [text.x + text.width / 2, text.y + text.height / 2];
  const corners: Point[] = [
    [text.x, text.y],
    [text.x + text.width, text.y],
    [text.x + text.width, text.y + text.height],
    [text.x, text.y + text.height],
  ];
  const points = corners.map((point) => rotate(point, center, text.angle));
  const containers = components.filter(
    (component) =>
      !component.isDeleted &&
      component.frameId === text.frameId &&
      points.every((point) => shapeDistance(point, component) <= 0.001),
  );
  return containers.length === 1 ? containers[0].id : undefined;
}
