"use client";
import { useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { chestResultSchema } from "@/lib/play/public";
import { usePlayRewards } from "./play-rewards";
import { PixelChest } from "./pixel-chest";
import styles from "./chest-node.module.css";
export function ChestNode({
  topic,
  afterLevel,
  unlocked,
  openedXp,
}: {
  topic: string;
  afterLevel: number;
  unlocked: boolean;
  openedXp?: number;
}) {
  const { request } = useCandidateAccount(),
    rewards = usePlayRewards();
  const [xp, setXp] = useState(openedXp),
    [busy, setBusy] = useState(false),
    [justOpened, setJustOpened] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function open() {
    if (lock.current || xp !== undefined || !unlocked) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await request("/api/play/chest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, afterLevel }),
      });
      const parsed = chestResultSchema.safeParse(await response.json());
      if (!response.ok || !parsed.success) throw Error("Unavailable");
      setXp(parsed.data.xp);
      setJustOpened(true);
      rewards?.applyTotals(parsed.data.totals, true);
    } catch {
      setError("Could not open this chest. Please retry.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={styles.chest} data-open={xp !== undefined}>
      <button
        type="button"
        disabled={!unlocked || busy || xp !== undefined}
        onClick={() => void open()}
        aria-label={
          xp !== undefined
            ? `Chest opened: +${xp} XP`
            : `Open chest after Level ${afterLevel}`
        }
      >
        <PixelChest open={xp !== undefined} animate={justOpened} />
      </button>
      {justOpened && (
        <span className={styles.gold} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      <span role="status" data-game-label>
        {xp !== undefined
          ? `+${xp} XP`
          : busy
            ? "Opening..."
            : unlocked
              ? "Open!"
              : `Pass LV ${afterLevel}`}
      </span>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
