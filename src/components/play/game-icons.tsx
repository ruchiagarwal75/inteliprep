import type { SVGProps } from "react";
export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="21"
      viewBox="0 0 24 26"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M13 1c1 6-4 7-4 11-2-1-2-3-2-4C3 12 2 15 3 19c1 5 5 7 9 7s9-3 9-9c0-5-4-7-4-10-1 2-1 3-2 4 0-4 0-7-2-10Z" />
    </svg>
  );
}

export function BadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m11 24-3 13 8-4 5 4 2-12m2-2 6 14 2-8 5-3-10-9" />
      <circle cx="20" cy="15" r="12" fill="var(--amber-soft)" />
      <path
        d="m20 7 2.3 4.6 5.1.8-3.7 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.7-3.6 5.1-.8Z"
        fill="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
