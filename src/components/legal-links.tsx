import styles from "./legal-links.module.css";
import Link from "next/link";
export function LegalLinks() {
  return (
    <footer className={styles.links} aria-label="Legal">
      <Link href="/privacy">Privacy policy</Link>
      {" · "}
      <Link href="/terms">Terms</Link>
    </footer>
  );
}
