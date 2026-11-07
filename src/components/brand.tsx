import Image from "next/image";
import { BRAND } from "@/lib/brand";

/** A non-navigating wordmark also works safely inside a live interview. */
export function Brand({
  compact = false,
  small = false,
}: {
  compact?: boolean;
  small?: boolean;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 align-middle">
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
    </span>
  );
}
