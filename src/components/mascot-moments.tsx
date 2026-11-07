"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Scorecard } from "@/lib/scorecard";
import { MASCOT_TIMING, resultNeedsEncouragement } from "@/lib/mascot-timing";
import { useMascotEnvironment } from "@/components/use-mascot-environment";
import { MascotAppearance } from "@/components/mascot-appearance";

function useOncePeek(ready: boolean) {
  const [show, setShow] = useState(false);
  const consumed = useRef(false);
  const finish = useCallback(() => setShow(false), []);
  const env = useMascotEnvironment(finish);
  useEffect(() => {
    if (!ready || !env.ready || !env.loaded || consumed.current) return;
    if (!env.enabled || !env.visible) return;
    const timer = setTimeout(() => {
      consumed.current = true;
      setShow(true);
    }, MASCOT_TIMING.delay);
    return () => clearTimeout(timer);
  }, [ready, env]);
  // Turning the preference off cancels this visit; turning it back on never replays it.
  useEffect(() => {
    if (!show || env.enabled) return;
    const timer = setTimeout(finish, 0);
    return () => clearTimeout(timer);
  }, [show, env.enabled, finish]);
  return { show: show && env.enabled && env.visible, finish };
}
export function HomeMascot() {
  const { show, finish } = useOncePeek(true);
  return show ? (
    <MascotAppearance pose="wave" cardPeek onDone={finish} />
  ) : null;
}
export function ResultsMascot({
  scorecard,
  ready,
}: {
  scorecard?: Scorecard;
  ready: boolean;
}) {
  const { show, finish } = useOncePeek(Boolean(scorecard) && ready);
  return show && scorecard ? (
    <MascotAppearance
      pose="done"
      gentle={resultNeedsEncouragement(scorecard)}
      onDone={finish}
    />
  ) : null;
}
