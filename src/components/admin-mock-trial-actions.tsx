"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminMockTrial } from "@/lib/admin-mock-trials";
export function AdminMockTrialActions({ row }: { row: AdminMockTrial }) {
  const router = useRouter();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  const command = useRef<{
    action: "approve" | "revoke";
    version: number;
    id: string;
  } | null>(null);
  async function change(action: "approve" | "revoke") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    if (
      !command.current ||
      command.current.action !== action ||
      command.current.version !== row.version
    )
      command.current = {
        action,
        version: row.version,
        id: crypto.randomUUID(),
      };
    try {
      const response = await fetch("/api/admin/mock-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: row.id,
          action,
          commandId: command.current.id,
          expectedVersion: row.version,
        }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? "This request changed. Refresh the page before deciding again."
            : "Could not update access. Please retry.",
        );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update access.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="practice-primary"
          disabled={pending || row.state === "approved"}
          onClick={() => void change("approve")}
        >
          {row.state === "approved"
            ? "One trial approved"
            : row.state === "used"
              ? "Grant another trial"
              : "Approve one trial"}
        </button>
        <button
          type="button"
          className="practice-secondary"
          disabled={pending || row.state === "revoked"}
          onClick={() => void change("revoke")}
        >
          Revoke access
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
