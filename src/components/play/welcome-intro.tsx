"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCandidateAccount } from "@/components/candidate-account-context";
export function WelcomeIntro({ runId }: { runId: string }) {
  const { request } = useCandidateAccount(),
    router = useRouter();
  const lock = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function skip() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await request("/api/play/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, action: "skip", panel: 1 }),
      });
      if (!response.ok) throw Error("save");
      router.replace("/play");
    } catch {
      lock.current = false;
      setBusy(false);
      setError("Could not save. Please try again.");
    }
  }
  return (
    <section aria-label="Welcome">
      <h1>Welcome, engineer</h1>
      <button
        className="practice-primary"
        onClick={() => void skip()}
        disabled={busy}
      >
        Skip
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
