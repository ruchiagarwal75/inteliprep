"use client";

import { useEffect, useRef } from "react";
import {
  interviewHref,
  interviewIdFromSearch,
} from "@/lib/interview-navigation";

export function updateInterviewUrl(
  id: string | undefined,
  navigation: "push" | "replace" | "none",
) {
  if (navigation === "none") return;
  const href = interviewHref(id);
  if (`${window.location.pathname}${window.location.search}` === href) return;
  if (navigation === "push") window.history.pushState(null, "", href);
  else window.history.replaceState(null, "", href);
}

export function useInterviewNavigation({
  ready,
  busy,
  open,
  reset,
}: {
  ready: boolean;
  busy: boolean;
  open: (id: string, navigation: "none") => Promise<boolean>;
  reset: (discard: boolean, navigation: "none") => Promise<boolean>;
}) {
  const pending = useRef(false);
  useEffect(() => {
    async function navigate() {
      if (!ready || busy) {
        pending.current = true;
        return;
      }
      pending.current = false;
      const id = interviewIdFromSearch(window.location.search);
      if (id) await open(id, "none");
      else await reset(false, "none");
    }
    const onPopState = () => {
      void navigate();
    };
    window.addEventListener("popstate", onPopState);
    if (pending.current && ready && !busy) void navigate();
    return () => window.removeEventListener("popstate", onPopState);
  }, [ready, busy, open, reset]);
}
