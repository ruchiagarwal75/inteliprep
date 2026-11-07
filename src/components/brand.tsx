import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

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
      className="inline-flex shrink-0 items-center gap-2.5 align-middle no-underline"
    >
      <Image
        src="/brand-mark.svg"
        alt=""
        width={small ? 28 : 36}
        height={small ? 28 : 36}
      />
      <span
        className={
          compact
            ? "sr-only"
            : `${small ? "text-lg" : "text-2xl"} font-bold tracking-tight`
        }
      >
        {BRAND.name}
      </span>
    </Link>
  );
}
