import { BADGE_LABELS } from "@/lib/play/public";
import { BADGE_REWARDS } from "./badge-rewards";
import { PixelSprite } from "./pixel-sprite";
import { PIXEL_ART } from "./pixel-art";
import styles from "./celebration.module.css";
export function Celebration({
  title,
  badges = [],
}: {
  title: string;
  badges?: string[];
}) {
  const earned = BADGE_REWARDS.filter((badge) => badges.includes(badge.id));
  if (!earned.length) return null;
  return (
    <aside className={styles.panel} aria-label={title}>
      <ul aria-live="polite">
        {earned.map((badge) => (
          <li key={badge.id} className={styles.reward}>
            <span className={styles.icon}>
              <PixelSprite art={PIXEL_ART.star} width="36" height="28" />
            </span>
            <div>
              <h2 className={styles.name}>{BADGE_LABELS[badge.id]}</h2>
              <p className={styles.meaning}>{badge.meaning}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
