"use client";
import { useState } from "react";
export function InAppSignInBanner({ guest }: { guest: boolean }) {
  const [notice, setNotice] = useState("");
  return (
    <aside className="practice-surface">
      <strong>Open in your browser to sign in</strong>
      <p>
        Google sign-in may not work inside this app. Open this page in Chrome or
        Safari.
      </p>
      {guest && (
        <p>
          Your guest progress stays in this browser. Opening another browser
          will not transfer it.
        </p>
      )}
      <button
        className="practice-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              new URL("/sign-in", window.location.origin).href,
            );
            setNotice("Link copied.");
          } catch {
            setNotice(
              "Could not copy. Open this page in your browser using the app menu.",
            );
          }
        }}
      >
        Copy sign-in link
      </button>
      <p role="status">{notice}</p>
    </aside>
  );
}
