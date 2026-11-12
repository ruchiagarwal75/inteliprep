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
  const [received, setReceived] = useState(initial),
    [totals, setTotals] = useState(initial),
    timer = useRef<number | undefined>(undefined),
    pending = useRef(initial);
  if (
    initial?.points !== received?.points ||
    initial?.streak !== received?.streak
  ) {
    setReceived(initial);
    setTotals(initial);
  }
  const applyTotals = useCallback((value: PlayTotals, animate: boolean) => {
    window.clearTimeout(timer.current);
    pending.current = value;
    if (
      !animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTotals(value);
      return;
    }
    setTotals((old) => (old ? { ...old, streak: value.streak } : value));
    timer.current = window.setTimeout(() => setTotals(pending.current), 650);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const value = useMemo(() => ({ totals, applyTotals }), [totals, applyTotals]);
  return (
    <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>
  );
}
