"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LevelUp } from "./level-up";
import type { ReactNode } from "react";
import type { PlayTotals } from "@/lib/play/public";
type Rewards = {
  totals: PlayTotals | undefined;
  applyTotals: (totals: PlayTotals, animate: boolean) => void;
};
const RewardsContext = createContext<Rewards | undefined>(undefined);
export const usePlayRewards = () => useContext(RewardsContext);
/** Display only server totals. Neither this state nor the animation is submitted as an outcome. */
export function PlayRewardsProvider({
  initial,
  children,
}: {
  initial?: PlayTotals;
  children: ReactNode;
}) {
  const [levelUp, setLevelUp] = useState<number>();
  const [received, setReceived] = useState(initial),
    [totals, setTotals] = useState(initial),
    timer = useRef<number | undefined>(undefined),
    pending = useRef(initial);
  if (
    initial?.points !== received?.points ||
    initial?.streak !== received?.streak ||
    initial?.dailyGoal !== received?.dailyGoal
  ) {
    setReceived(initial);
    setTotals(initial);
  }
  useEffect(() => {
    pending.current = initial;
  }, [initial]);
  const applyTotals = useCallback((value: PlayTotals, animate: boolean) => {
    window.clearTimeout(timer.current);
    const previousLevel = pending.current?.xpLevel?.level;
    if (
      previousLevel !== undefined &&
      value.xpLevel &&
      value.xpLevel.level > previousLevel
    )
      setLevelUp(value.xpLevel.level);
    pending.current = value;
    if (
      !animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTotals(value);
      return;
    }
    setTotals((old) =>
      old
        ? { ...old, streak: value.streak, dailyGoal: value.dailyGoal }
        : value,
    );
    timer.current = window.setTimeout(() => setTotals(pending.current), 220);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function dismissLevelUp() {
    setLevelUp(undefined);
    requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>(
          '[aria-label="Drill result"] > button',
        ) ??
        document.querySelector<HTMLElement>('[aria-current="step"] summary');
      target?.focus({ preventScroll: true });
    });
  }
  const value = useMemo(() => ({ totals, applyTotals }), [totals, applyTotals]);
  return (
    <RewardsContext.Provider value={value}>
      {children}
      {levelUp !== undefined && (
        <LevelUp level={levelUp} onClose={dismissLevelUp} />
      )}
    </RewardsContext.Provider>
  );
}
