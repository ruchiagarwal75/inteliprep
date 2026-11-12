"use client";
import { z } from "zod";
import { startRoundResultSchema } from "@/lib/play/public";
import { primeRound, markRoundClick } from "./round-prefetch";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCandidateAccount } from "@/components/candidate-account-context";
export function StartRound({
  topic,
  mode,
  level,
  label,
  disabled = false,
}: {
  topic: string;
  mode: "level" | "placement" | "review";
  level?: number;
  label: string;
  disabled?: boolean;
}) {
  const { request, userId } = useCandidateAccount(),
    router = useRouter(),
    locked = useRef(false),
    requestId = useRef<string>(undefined),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function start() {
    if (locked.current) return;
    locked.current = true;
    markRoundClick();
    setBusy(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await request("/api/play/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          topic,
          mode,
          ...(mode === "level" ? { level } : {}),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data: unknown = await response.json();
      const parsed = startRoundResultSchema.safeParse(data);
      if (!response.ok || !parsed.success) {
        setError(
          errorResponse.safeParse(data).data?.error ??
            "Could not start this round. Please retry.",
        );
        return;
      }
      if (parsed.data.view) primeRound(userId, parsed.data.view);
      router.push(`/play/${topic}/drill?session=${parsed.data.sessionId}`);
    } catch {
      setError("Could not connect. Please retry.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="practice-primary"
        disabled={disabled || busy}
        onPointerEnter={() => void import("./drill-runner").catch(() => {})}
        onFocus={() => void import("./drill-runner").catch(() => {})}
        onClick={() => void start()}
      >
        {busy ? "Starting..." : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
const errorResponse = z.object({ error: z.string() });
