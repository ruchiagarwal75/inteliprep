import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { LegalLinks } from "@/components/legal-links";
import styles from "./legal-page.module.css";
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="practice-page">
      <div className="practice-shell">
        <Brand />
        <article className={`practice-surface ${styles.content}`}>
          <h1>{title}</h1>
          <p>Updated November 7, 2026</p>
          {children}
        </article>
        <LegalLinks />
      </div>
    </main>
  );
}
