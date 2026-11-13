import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BrandFace } from "@/components/brand-face";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { LegalLinks } from "@/components/legal-links";
import { HomeMascot } from "@/components/mascot-moments";
import ScalingStory from "@/components/scaling-story/ScalingStory";
import styles from "./play.module.css";
export function PlayLanding() {
  return (
    <main className="practice-page mascot-home-page">
      <div className="practice-shell">
        <header className="practice-nav">
          <Brand />
          <div className="header-controls">
            <ThemeToggle />
            <Link href="/sign-in">Sign in</Link>
          </div>
        </header>
        <section className={styles.landing}>
          <div>
            <BrandFace size={64} />
            <p className="practice-eyebrow">AI engineer practice</p>
            <h1>{BRAND.tagline}</h1>
            <p>{BRAND.pitch}</p>
            <Link className="practice-primary" href="/sign-in">
              Start free
            </Link>
          </div>
          <ScalingStory showControls={false} />
        </section>
        <section className={`practice-surface ${styles.intro}`}>
          <HomeMascot />
          <h2>Start with RAG</h2>
          <p>
            Practice retrieval, scale math, permissions and safety. Get feedback
            after each round, then try a full mock.
          </p>
          <p>RAG is the first beta topic. More topics are coming.</p>
        </section>
        <LegalLinks />
      </div>
    </main>
  );
}
