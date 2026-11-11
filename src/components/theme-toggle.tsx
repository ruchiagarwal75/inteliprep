"use client";
import { useTheme } from "@/components/theme-provider";
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label =
    theme === "light" ? "Switch to dark mode" : "Switch to light mode";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {theme === "light" ? (
          <path d="M20.9 13.2A8.8 8.8 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
