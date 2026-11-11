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
        className="quiet-signout border-border text-muted disabled:bg-accent-soft disabled:text-foreground rounded border px-2 py-1 text-xs font-medium disabled:opacity-100"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}
