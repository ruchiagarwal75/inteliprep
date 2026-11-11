"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { interviewLevelSchema } from "@/lib/interview-selection";
import { briefLevelKey } from "@/lib/brief-preferences";
export function TargetLevel({ value }: { value: "mid" | "senior" | "staff" }) {
  const { request, userId } = useCandidateAccount(),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change(raw: string) {
    const level = interviewLevelSchema.parse(raw);
    setBusy(true);
    setError("");
    try {
      const response = await request("/api/play/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          level,
        }),
      });
      if (!response.ok) throw Error("Settings unavailable");
      try {
        localStorage.setItem(briefLevelKey(userId), level);
      } catch {}
      router.refresh();
    } catch {
      setError("Could not save your target. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label>
        Interview level{" "}
        <select
          className="practice-secondary"
          aria-label="Interview level"
          value={value}
          disabled={busy}
          onChange={(e) => void change(e.target.value)}
        >
          <option value="mid">Mid-level</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
