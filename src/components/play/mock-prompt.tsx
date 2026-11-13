"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { RAG_BOSS } from "@/lib/mock-access-public";
import { useCandidateAccount } from "@/components/candidate-account-context";
import styles from "./celebration.module.css";
export function MockPrompt({
  topic,
  title,
}: {
  topic: string;
  title: string;
  problemId: string;
  level: "mid" | "senior" | "staff";
}) {
  const { request } = useCandidateAccount(),
    root = useRef<HTMLDivElement>(null),
    sent = useRef(false);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (sent.current || !entries.some((entry) => entry.isIntersecting))
          return;
        sent.current = true;
        void request("/api/play/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        }).catch(() => {});
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [request, topic]);
  return (
    <div ref={root} className={styles.panel}>
      <div>
        <h2>You&apos;re ready to test this for real.</h2>
        <p>The {title} World boss is waiting.</p>
      </div>
      <Link className="practice-primary" href={RAG_BOSS.promptHref}>
        Go to the {title} boss
      </Link>
    </div>
  );
}
