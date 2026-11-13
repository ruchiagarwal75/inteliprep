"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  mockAccessSchema,
  type MockAccess,
  type MockPlan,
} from "@/lib/mock-access-public";
import { AdminTime } from "./admin-format";

export function AdminMockAccess({
  userId,
  initial,
}: {
  userId: string;
  initial: MockAccess;
}) {
  const router = useRouter();
  const [access, setAccess] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function change(
    command:
      { action: "plan"; plan: MockPlan } | { action: "reset_free_attempt" },
  ) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (!response.ok)
        throw Error("Could not update mock access. Please retry.");
      // The refreshed server projection owns access. Never grant it optimistically.
      setAccess(mockAccessSchema.parse(await response.json()));
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update mock access.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="practice-surface" aria-label="Mock access">
      <h3>Mock access</h3>
      <p>
        Plan: {access.plan === "pro" ? "Pro" : "Free"}
        {access.admin ? " (admin)" : ""}
      </p>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Plan">
        {(["free", "pro"] as const).map((plan) => (
          <button
            key={plan}
            type="button"
            className="practice-secondary"
            aria-pressed={access.plan === plan}
            disabled={pending || access.admin}
            onClick={() => void change({ action: "plan", plan })}
          >
            {plan === "pro" ? "Pro" : "Free"}
          </button>
        ))}
      </div>
      <p>
        Free boss attempt:{" "}
        {access.freeBossUsedAt ? (
          <>
            Used <AdminTime value={access.freeBossUsedAt} />
          </>
        ) : (
          "Unused"
        )}
      </p>
      <button
        type="button"
        className="practice-secondary"
        disabled={pending || !access.freeBossUsedAt}
        onClick={() => void change({ action: "reset_free_attempt" })}
      >
        Reset free boss attempt
      </button>
      <p>
        Pro interest:{" "}
        {access.proInterestAt ? (
          <AdminTime value={access.proInterestAt} />
        ) : (
          "Not requested"
        )}
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
