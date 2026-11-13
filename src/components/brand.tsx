import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import styles from "./brand.module.css";

/** Use the locally generated transparent pixel variants for the current theme. */
export function BrandLogo({ hero = false }: { hero?: boolean }) {
  return (
    <span
      className={`${styles.logo} ${hero ? styles.hero : ""}`}
      aria-hidden="true"
    >
      <Image
        className={styles.light}
        src="/brand/pixel/shardling-lockup.svg"
        alt=""
        width={194}
        height={48}
        unoptimized
      />
      <Image
        className={styles.dark}
        src="/brand/pixel/shardling-lockup-dark.svg"
        alt=""
        width={194}
        height={48}
        unoptimized
      />
    </span>
  );
}
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <Image
      src="/brand/pixel/shardling-mark.svg"
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
