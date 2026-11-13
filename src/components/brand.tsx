import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BrandFace } from "./brand-face";
import styles from "./brand.module.css";

/** The logo and wordmark share one accessible link back to Home. */
export function Brand({
  compact = false,
  small = false,
}: {
  compact?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={`${BRAND.name} home`}
      className={`${styles.link} ${small ? styles.small : ""}`}
    >
      <BrandFace size={small ? 28 : 36} />
      <span className={compact ? "sr-only" : styles.wordmark}>
        {BRAND.name.toLowerCase()}
      </span>
    </Link>
  );
}
