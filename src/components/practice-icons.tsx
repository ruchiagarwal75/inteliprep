import type { SVGProps } from "react";

export function PracticeIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: "arrow" | "draw" | "explain" | "discuss" | "clock" | "chevron";
}) {
  const paths = {
    arrow: "M4 12h15m-6-6 6 6-6 6",
    draw: "m5 16-1 4 4-1L19 8l-3-3L5 16Zm9-9 3 3M4 21h16",
    explain:
      "M7 10h10M7 14h6M5 4h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9l-5 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    discuss: "m5 12 4 4L19 6M4 3h16v18H4V3Z",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    chevron: "m9 5 7 7-7 7",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function HouseIcon({ lit = false }: { lit?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width="40"
      height="40"
      aria-hidden="true"
      focusable="false"
      className={lit ? "house-icon is-lit" : "house-icon"}
    >
      <path
        d="m5 18 15-12 15 12M9 16v19h22V16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 25h6v10h-6z" className="house-window" />
      <path d="M13 21h4v4h-4zm10 0h4v4h-4z" className="house-window" />
    </svg>
  );
}
