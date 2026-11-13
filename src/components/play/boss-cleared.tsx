"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { WorldNotice } from "./world-notice";
const claimSchema = z.object({ show: z.boolean() });
export function BossCleared({
  armed,
  sessionId,
}: {
  armed: boolean;
  sessionId: string;
}) {
  const { request } = useCandidateAccount();
  const [visible, setVisible] = useState(false);
  const claim = useRef<Promise<boolean> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!armed) return;
    let active = true;
    claim.current ??= request("/api/play/boss/cleared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(
        async (response) =>
          response.ok && claimSchema.parse(await response.json()).show,
      )
      .catch(() => false);
    void claim.current.then((show) => {
      if (active && show) setVisible(true);
    });
    return () => {
      active = false;
    };
  }, [armed, request]);
  useEffect(() => {
    if (!visible) return;
    root.current?.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    const timer = setTimeout(() => setVisible(false), 6500);
    return () => clearTimeout(timer);
  }, [visible]);
  return visible ? (
    <div ref={root}>
      <WorldNotice
        kind="cleared"
        resultsHref={`/interview/${sessionId}/results`}
        onDismiss={() => setVisible(false)}
      />
    </div>
  ) : null;
}
