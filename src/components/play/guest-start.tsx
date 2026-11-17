"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startGuest } from "@/lib/guest-start-browser";
declare global {
  interface Window {
    turnstile?: {
      render(
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ): string;
      remove(id: string): void;
      reset(id: string): void;
    };
  }
}
export function GuestStart({ nonce }: { nonce?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const widget = useRef<string>(undefined);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const open = useCallback(
    async (token?: string) => {
      setBusy(true);
      setError("");
      try {
        await startGuest(token);
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Please retry opening Play.",
        );
        setBusy(false);
      }
    },
    [router],
  );
  useEffect(() => {
    if (!key && process.env.NODE_ENV === "development") {
      const timer = window.setTimeout(() => void open(), 0);
      return () => window.clearTimeout(timer);
    }
    if (!key || !ready || !root.current || !window.turnstile) return;
    const id = window.turnstile.render(root.current, {
      sitekey: key,
      callback: (token) => void open(token),
      "expired-callback": () => setError("Please complete the check again."),
      "error-callback": () =>
        setError("The browser check could not finish. Please retry."),
    });
    widget.current = id;
    return () => {
      window.turnstile?.remove(id);
      widget.current = undefined;
    };
  }, [key, ready, open]);
  return (
    <section className="practice-surface" aria-label="Start guest practice">
      <h1>Try your first topics</h1>
      <p>Your progress starts here. No sign-in needed.</p>
      {busy && <p role="status">Opening Play...</p>}
      {!key && process.env.NODE_ENV !== "development" && (
        <p role="status">
          Guest practice is not ready yet. You can sign in to play.
        </p>
      )}
      {key && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            nonce={nonce}
            onReady={() => setReady(true)}
            onError={() =>
              setError("The browser check could not load. Please retry.")
            }
          />
          <div ref={root} />
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {error && (
        <button
          className="practice-secondary"
          disabled={busy}
          onClick={() => {
            if (widget.current) window.turnstile?.reset(widget.current);
            else if (key) window.location.reload();
            else if (process.env.NODE_ENV === "development") void open();
          }}
        >
          Retry
        </button>
      )}
      <Link className="practice-secondary" href="/sign-in">
        Sign in
      </Link>
    </section>
  );
}
