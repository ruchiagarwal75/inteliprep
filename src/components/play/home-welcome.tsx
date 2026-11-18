"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HOME_INTRO_COOKIE,
  HOME_INTRO_SEEN,
  homeIntroSeen,
} from "@/lib/play/home-intro-preference";
import { isAutomatedViewer } from "@/lib/viewer-automation";
const Intro = dynamic(
  () => import("./welcome-intro").then((module) => module.WelcomeIntro),
  { ssr: false },
);

/** Introduce the product before authentication or the guest browser check. */
export function HomeWelcome() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (isAutomatedViewer(navigator.userAgent, navigator.webdriver)) return;
    try {
      const value = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${HOME_INTRO_COOKIE}=`))
        ?.slice(HOME_INTRO_COOKIE.length + 1);
      if (homeIntroSeen(value)) return;
    } catch {
      // Unavailable preference storage must not prevent the public intro opening.
    }
    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return open ? (
    <Intro
      onFinish={async ({ action }) => {
        try {
          document.cookie = `${HOME_INTRO_COOKIE}=${HOME_INTRO_SEEN}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        } catch {
          // The intro can still be dismissed if preference storage is unavailable.
        }
        setOpen(false);
        if (action === "complete") router.push("/play");
        else
          window.requestAnimationFrame(() =>
            document
              .querySelector<HTMLAnchorElement>("[data-home-start]")
              ?.focus(),
          );
      }}
    />
  ) : null;
}
