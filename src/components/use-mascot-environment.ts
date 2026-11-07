"use client";
import { useEffect, useMemo, useState } from "react";
import { useMascotPreference } from "@/components/mascot-preference";

export function useMascotEnvironment(cancel: () => void) {
  const preference = useMascotPreference();
  const [browser, setBrowser] = useState({
    ready: false,
    wide: false,
    visible: false,
    loaded: false,
  });
  useEffect(() => {
    // Reduced motion still gets the brief visit, with a CSS fade and no gestures.
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => {
      const visible = !document.hidden;
      if (!media.matches || !visible) cancel();
      setBrowser({
        ready: true,
        wide: media.matches,
        visible,
        loaded: document.readyState === "complete",
      });
    };
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("load", update);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("load", update);
    };
  }, [cancel]);
  return useMemo(
    () => ({ ...browser, preference, enabled: browser.wide && preference }),
    [browser, preference],
  );
}
