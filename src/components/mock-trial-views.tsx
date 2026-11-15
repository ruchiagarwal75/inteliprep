"use client";
import { useEffect, type RefObject } from "react";
import { useCandidateAccount } from "./candidate-account-context";

/** Visible foreground cards only. The server deduplicates by account and problem. */
export function MockTrialViews({
  scope,
}: {
  scope: RefObject<HTMLDivElement | null>;
}) {
  const { request } = useCandidateAccount();
  useEffect(() => {
    const nodes = scope.current?.querySelectorAll<HTMLElement>(
      "[data-trial-problem]",
    );
    if (!nodes) return;
    const sent = new Set<string>(),
      pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (document.hidden) return;
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-trial-problem");
          if (entry.intersectionRatio >= 0.5 && id && !sent.has(id))
            pending.add(id);
        }
        if (!pending.size || timer) return;
        timer = setTimeout(() => {
          timer = undefined;
          if (document.hidden) {
            pending.clear();
            return;
          }
          const problemIds = [...pending];
          pending.clear();
          problemIds.forEach((id) => sent.add(id));
          void request("/api/mock/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problemIds }),
            keepalive: true,
          }).catch(() => {});
        }, 200);
      },
      { threshold: 0.5 },
    );
    const observe = () => {
      observer.disconnect();
      if (!document.hidden) nodes.forEach((node) => observer.observe(node));
    };
    observe();
    document.addEventListener("visibilitychange", observe);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", observe);
    };
  }, [request, scope]);
  return null;
}
