"use client";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GUEST_SIGN_IN_MESSAGE } from "@/lib/play/guest-policy";
const GuestContext = createContext({
  guest: false,
  promptSeen: true,
  markSeen: () => {},
});
export const useGuestAccount = () => useContext(GuestContext);
export function GuestAccountProvider({
  guest = false,
  seen = false,
  children,
}: {
  guest?: boolean;
  seen?: boolean;
  children: ReactNode;
}) {
  const [promptSeen, setSeen] = useState(seen);
  const value = useMemo(
    () => ({ guest, promptSeen, markSeen: () => setSeen(true) }),
    [guest, promptSeen],
  );
  return (
    <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
  );
}
export function GuestPromptEvent({
  reason,
}: {
  reason: "first_drill" | "limit";
}) {
  useEffect(() => {
    void fetch("/api/play/guest/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).catch(() => {});
  }, [reason]);
  return null;
}
export function GuestSignInPrompt({
  reason,
  onDismiss,
}: {
  reason: "first_drill" | "limit";
  onDismiss?: () => void;
}) {
  return (
    <aside
      className="practice-surface"
      aria-label="Save your guest progress"
      data-guest-prompt={reason}
    >
      <GuestPromptEvent reason={reason} />
      <p>{GUEST_SIGN_IN_MESSAGE}</p>
      <Link className="practice-primary" href="/sign-in?guest=1">
        Save progress with Google
      </Link>{" "}
      {onDismiss && (
        <button className="practice-secondary" onClick={onDismiss}>
          Not now
        </button>
      )}
    </aside>
  );
}
export function GuestQuizPrompt({ answered }: { answered: boolean }) {
  const { guest, promptSeen, markSeen } = useGuestAccount();
  return guest && answered && !promptSeen ? (
    <GuestSignInPrompt reason="first_drill" onDismiss={markSeen} />
  ) : null;
}
