"use client";
import { useEffect, useRef } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
/** Resolve the time zone once on the server; later visits never silently change it. */
export function PlayerBootstrap() {
  const { request } = useCandidateAccount(),
    started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void request("/api/play/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone }),
    }).catch(() => {});
  }, [request]);
  return null;
}
