import type { SVGProps } from "react";
import type { PixelArt } from "./pixel-grid";
import styles from "./pixel-sprite.module.css";
export function PixelSprite({
  art,
  label,
  ...props
}: Omit<
  SVGProps<SVGSVGElement>,
  "children" | "dangerouslySetInnerHTML" | "viewBox"
> & { art: PixelArt; label?: string }) {
  return (
    <svg
      {...props}
      className={`${styles.sprite} ${props.className ?? ""}`}
      viewBox={`0 0 ${art.width} ${art.height}`}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-pixel-sprite
    >
      {art.paths.map((path) => (
        <path key={path.color} d={path.d} fill={path.color} />
      ))}
    </svg>
  );
}
