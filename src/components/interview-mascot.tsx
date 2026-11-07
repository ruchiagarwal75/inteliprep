"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceMascotClock,
  createMascotClock,
  restoredMascotTime,
  MASCOT_SCHEDULE,
  MASCOT_TEST_SCHEDULE,
} from "@/lib/mascot-timing";
import { MascotAppearance } from "@/components/mascot-appearance";
import { useMascotEnvironment } from "@/components/use-mascot-environment";

/** Decorative clock only: never writes interview timing, answers or saved sessions. */
export function InterviewMascot({
  sessionId,
  startedAt,
  deadlineAt,
  clockOffsetMs,
  paused,
  blocked,
  blockedReason = "interview is busy",
  testMode = false,
  immediate = false,
}: {
  sessionId: string;
  startedAt: string;
  deadlineAt: string;
  clockOffsetMs: number;
  paused: boolean;
  blocked: boolean;
  blockedReason?: string;
  testMode?: boolean;
  immediate?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [centered, setCentered] = useState(false);
  const showing = useRef(false);
  const finish = useCallback(() => {
    showing.current = false;
    setShow(false);
  }, []);
  const environment = useMascotEnvironment(finish);
  const inputs = useRef({ paused, blocked, blockedReason, environment });
  const tick = useRef<() => void>(() => {});
  useEffect(() => {
    inputs.current = { paused, blocked, blockedReason, environment };
    tick.current();
  }, [paused, blocked, blockedReason, environment]);

  useEffect(() => {
    const test = process.env.NODE_ENV === "development" && testMode;
    const schedule = test
      ? immediate
        ? { first: 1000, repeat: 45000 }
        : MASCOT_TEST_SCHEDULE
      : MASCOT_SCHEDULE;
    const debug = test && process.env.NODE_ENV === "development";
    const log = (event: string, detail: object = {}) => {
      if (debug) console.info("[MockMeAI mascot]", event, detail);
    };
    const key = `mockmeai:mascot-clock:v2:${sessionId}:${test ? (immediate ? "instant" : "test") : "normal"}`;
    const elapsed = Math.max(
      0,
      Date.now() + clockOffsetMs - Date.parse(startedAt),
    );
    let restored: string | null = null;
    try {
      restored = sessionStorage.getItem(key);
    } catch {
      // Browser storage is optional for this decorative feature.
    }
    if (test && immediate) restored = null;
    let hasAppeared = false;
    try {
      hasAppeared = JSON.parse(restored ?? "null")?.shown === true;
    } catch {
      /* Older UI clock entries have no visit marker. */
    }
    let clock = createMascotClock(
      test && immediate ? 0 : restoredMascotTime(restored, elapsed),
      schedule,
    );
    log("mounted", {
      sessionId,
      schedule,
      activeSeconds: clock.activeMs / 1000,
      width: window.innerWidth,
    });
    let previous = performance.now();
    let running = false;
    let lastActivity = previous;
    let heldPointer = false;
    let composing = false;
    let wasBlocked = true;
    let lastSave = previous;
    let retryAt = 0;
    let lastReasons = "";
    const save = () => {
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({ activeMs: clock.activeMs, shown: hasAppeared }),
        );
      } catch {
        // A mascot must never interrupt an interview.
      }
    };
    const activity = () => {
      lastActivity = performance.now();
      if (showing.current) finish();
    };
    const pointerDown = () => {
      heldPointer = true;
      activity();
    };
    const pointerUp = () => {
      heldPointer = false;
      activity();
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.buttons) activity();
    };
    const compositionStart = () => {
      composing = true;
      activity();
    };
    const compositionEnd = () => {
      composing = false;
      activity();
    };
    const blur = () => {
      heldPointer = false;
      composing = false;
      activity();
    };
    const update = () => {
      const now = performance.now();
      const state = inputs.current;
      // Ignore suspended/throttled time, including a sleeping laptop.
      const delta = running ? Math.min(2000, Math.max(0, now - previous)) : 0;
      previous = now;
      // Drawing pauses questions, not the interview. Only a genuine pause/hidden tab stops this UI clock.
      running = state.environment.visible && !state.paused;
      const reasons = [
        state.blocked ? state.blockedReason : "",
        state.paused ? "interview paused" : "",
        !state.environment.preference ? "Show mascot is off" : "",
        !state.environment.wide ? "screen below 768px" : "",
        !state.environment.visible ? "tab hidden" : "",
        heldPointer ? "pointer held / drawing" : "",
        composing ? "text composition" : "",
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]',
        )
          ? "dialog open"
          : "",
      ].filter(Boolean);
      const unsafe = reasons.length > 0;
      if (debug && reasons.join(", ") !== lastReasons) {
        lastReasons = reasons.join(", ");
        log("safety", {
          blockedBy: reasons,
          activeSeconds: Math.round(clock.activeMs / 1000),
        });
      }
      if (unsafe !== wasBlocked) {
        lastActivity = now;
        wasBlocked = unsafe;
      }
      if (unsafe && showing.current) finish();
      const next = advanceMascotClock(
        clock,
        delta,
        {
          allowed: !unsafe && !showing.current && now >= retryAt,
          quietMs: now - lastActivity,
          remainingMs: Date.parse(deadlineAt) - (Date.now() + clockOffsetMs),
        },
        schedule,
      );
      clock = next.clock;
      if (clock.pending && now >= retryAt) {
        retryAt = now + 5000;
        log("deferred; retry in 5 seconds", {
          blockedBy: [
            ...reasons,
            ...(now - lastActivity < 5000
              ? ["waiting for 5 quiet seconds"]
              : []),
          ],
          activeSeconds: Math.round(clock.activeMs / 1000),
        });
      }
      if (next.appear) {
        retryAt = 0;
        log("show working", {
          activeSeconds: Math.round(clock.activeMs / 1000),
        });
        showing.current = true;
        setCentered(!hasAppeared);
        hasAppeared = true;
        save();
        setShow(true);
      }
      if (now - lastSave >= 10_000) {
        save();
        lastSave = now;
        log("clock tick", {
          activeSeconds: Math.round(clock.activeMs / 1000),
          pending: clock.pending,
          remainingSeconds: Math.round(
            (Date.parse(deadlineAt) - (Date.now() + clockOffsetMs)) / 1000,
          ),
        });
      }
    };
    tick.current = update;
    const interval = setInterval(update, 1000);
    document.addEventListener("keydown", activity, true);
    document.addEventListener("input", activity, true);
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("pointerup", pointerUp, true);
    document.addEventListener("pointercancel", pointerUp, true);
    document.addEventListener("pointermove", pointerMove, true);
    document.addEventListener("compositionstart", compositionStart, true);
    document.addEventListener("compositionend", compositionEnd, true);
    document.addEventListener("wheel", activity, {
      passive: true,
      capture: true,
    });
    window.addEventListener("blur", blur);
    window.addEventListener("pagehide", save);
    update();
    return () => {
      tick.current = () => {};
      clearInterval(interval);
      save();
      log("unmounted");
      document.removeEventListener("keydown", activity, true);
      document.removeEventListener("input", activity, true);
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("pointerup", pointerUp, true);
      document.removeEventListener("pointercancel", pointerUp, true);
      document.removeEventListener("pointermove", pointerMove, true);
      document.removeEventListener("compositionstart", compositionStart, true);
      document.removeEventListener("compositionend", compositionEnd, true);
      document.removeEventListener("wheel", activity, true);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", save);
    };
  }, [
    sessionId,
    startedAt,
    deadlineAt,
    clockOffsetMs,
    testMode,
    immediate,
    finish,
  ]);

  return show &&
    !paused &&
    !blocked &&
    environment.enabled &&
    environment.visible ? (
    <MascotAppearance pose="working" centered={centered} onDone={finish} />
  ) : null;
}
