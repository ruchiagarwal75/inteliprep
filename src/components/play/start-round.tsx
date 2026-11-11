"use client";
import { z } from "zod";
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
  const { request } = useCandidateAccount(),
    router = useRouter(),
    locked = useRef(false),
    requestId = useRef<string>(undefined),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function start() {
    if (locked.current) return;
    locked.current = true;
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
      const parsed = startResponse.safeParse(data);
      if (!response.ok || !parsed.success) {
        setError(
          errorResponse.safeParse(data).data?.error ??
            "Could not start this round. Please retry.",
        );
        return;
      }
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
        onClick={() => void start()}
      >
        {busy ? "Starting..." : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
const startResponse = z.object({ sessionId: z.uuid() }),
  errorResponse = z.object({ error: z.string() });
