"use client";

import { useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";

export function CandidateSignOut({ save }: { save: () => Promise<void> }) {
  const { signOut } = useCandidateAccount();
  const [busy, setBusy] = useState(false);
  async function leave() {
    setBusy(true);
    try {
      await save();
    } finally {
      await signOut();
    }
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void leave()}
      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
