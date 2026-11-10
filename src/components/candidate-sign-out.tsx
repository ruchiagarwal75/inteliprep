"use client";

import { useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";

export function CandidateSignOut({ save }: { save: () => Promise<void> }) {
  const { signOut } = useCandidateAccount();
  const [removeHistory, setRemoveHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  async function leave() {
    setBusy(true);
    try {
      await save();
    } finally {
      await signOut(removeHistory);
    }
  }
  return (
    <>
      <label className="history-removal-choice">
        <input
          type="checkbox"
          checked={removeHistory}
          disabled={busy}
          onChange={(event) => setRemoveHistory(event.target.checked)}
        />
        Also remove my practice history from this browser
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void leave()}
        className="quiet-signout rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-900 disabled:opacity-60 dark:border-white/50 dark:text-white"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}
