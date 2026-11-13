import { buildMascotFace } from "./mascot-art/mascotArt";
import styles from "./brand.module.css";
/** The existing girl mascot's face, cropped without redrawing her. */
export function BrandFace({ size = 36 }: { size?: number }) {
  return (
    <svg
      className={styles.face}
      viewBox="24 50 172 148"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-brand-face=""
      dangerouslySetInnerHTML={{
        __html:
          '<circle cx="110" cy="124" r="72" fill="var(--mascot-color-f6efe0)"/>' +
          buildMascotFace(),
      }}
    />
  );
}
