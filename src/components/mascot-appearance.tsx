"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Mascot from "@/components/mascot-art/Mascot";
import type { Pose } from "@/components/mascot-art/mascotArt";
import { MASCOT_TIMING } from "@/lib/mascot-timing";

/** Placement/visit lifecycle only. The supplied artwork and stylesheet are untouched. */
export function MascotAppearance({
  pose,
  gentle = false,
  onDone,
  preview = false,
  centered = false,
  cardPeek = false,
  cardTop = false,
}: {
  pose: Pose;
  gentle?: boolean;
  onDone: () => void;
  preview?: boolean;
  centered?: boolean;
  cardPeek?: boolean;
  cardTop?: boolean;
}) {
  const duration =
    pose === "wave"
      ? MASCOT_TIMING.wave
      : pose === "working"
        ? cardTop
          ? MASCOT_TIMING.briefWorking
          : centered
            ? MASCOT_TIMING.firstWorking
            : MASCOT_TIMING.working
        : MASCOT_TIMING.done;
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);
  const visual = (
    <div
      className={[
        "mascot-appearance",
        `mascot-appearance-${pose}`,
        gentle ? "mascot-gentle" : "",
        centered ? "mascot-appearance-center" : "",
        preview ? "mascot-preview-appearance" : "",
        cardPeek || cardTop ? "mascot-appearance-card" : "",
        cardTop ? "mascot-appearance-card-top" : "",
      ].join(" ")}
      data-mascot={pose}
      data-placement={
        cardPeek || cardTop
          ? "card"
          : centered
            ? "center"
            : pose === "wave"
              ? "left"
              : "right"
      }
      aria-hidden="true"
    >
      <div
        className="mascot-arrival"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) onDone();
        }}
      >
        <Mascot pose={pose} />
      </div>
    </div>
  );
  // Card peeks stay anchored to their surface; corner visits escape hidden chat tabs.
  return preview || cardPeek || cardTop
    ? visual
    : createPortal(visual, document.body);
}
