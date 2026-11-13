import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import styles from "./brand.module.css";

/** Show the supplied files unchanged; CSS chooses the variant for the app theme. */
export function BrandLogo({ hero = false }: { hero?: boolean }) {
  return (
    <span
      className={`${styles.logo} ${hero ? styles.hero : ""}`}
      aria-hidden="true"
    >
      <Image
        className={styles.light}
        src="/brand/shardling-lockup.svg"
        alt=""
        width={446}
        height={152}
        unoptimized
      />
      <Image
        className={styles.dark}
        src="/brand/shardling-lockup-badge.svg"
        alt=""
        width={482}
        height={188}
        unoptimized
      />
    </span>
  );
}
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/brand/shardling-mark.svg"
      alt=""
      width={size}
      height={size}
      unoptimized
    />
  );
}
/** Preserve the existing Home link and compact/small interfaces. */
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
      {compact ? <BrandMark size={36} /> : <BrandLogo />}
    </Link>
  );
}
