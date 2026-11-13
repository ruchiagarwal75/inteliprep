"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { useCandidateAccount } from "./candidate-account-context";
import { InterviewDialog } from "./interview-dialog";
const savedSchema = z.object({ saved: z.literal(true) });
export function ProInterestButton({
  label = "Choose mock",
  interested = false,
  primary = false,
}: {
  label?: string;
  interested?: boolean;
  primary?: boolean;
}) {
  const { request } = useCandidateAccount();
  const [open, setOpen] = useState(false),
    [saved, setSaved] = useState(interested),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  async function notify() {
    if (busy.current || saved) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await request("/api/mock/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok)
        throw Error(
          response.status === 429
            ? "Please wait a moment before trying again."
            : "Could not save your interest. Please retry.",
        );
      savedSchema.parse(await response.json());
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your interest. Please retry.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={primary ? "practice-primary" : "practice-secondary"}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <InterviewDialog
        open={open}
        title="Mock interviews are part of Pro"
        onClose={() => setOpen(false)}
      >
        <p>Pro isn&apos;t for sale yet. Want to hear when it is?</p>
        {saved ? (
          <p role="status">You&apos;re on the list.</p>
        ) : (
          <button
            type="button"
            className="practice-primary"
            disabled={pending}
            onClick={() => void notify()}
          >
            {pending ? "Saving..." : "Notify me"}
          </button>
        )}
        {error && <p role="alert">{error}</p>}
      </InterviewDialog>
    </>
  );
}
