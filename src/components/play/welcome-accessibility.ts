"use client";
import { useSyncExternalStore, type KeyboardEvent } from "react";
const motionSubscribe = (changed: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", changed);
  return () => mq.removeEventListener("change", changed);
};
const motionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const visibilitySubscribe = (changed: () => void) => {
  document.addEventListener("visibilitychange", changed);
  return () => document.removeEventListener("visibilitychange", changed);
};
const hiddenSnapshot = () => document.hidden;
const serverSnapshot = () => false;
export function useWelcomeMotion() {
  return {
    reduced: useSyncExternalStore(
      motionSubscribe,
      motionSnapshot,
      serverSnapshot,
    ),
    hidden: useSyncExternalStore(
      visibilitySubscribe,
      hiddenSnapshot,
      serverSnapshot,
    ),
  };
}
/** Native modality makes the background inert; close the keyboard loop explicitly. */
export function trapWelcomeFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>(
    "button:not(:disabled)",
  );
  const first = buttons[0],
    last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
