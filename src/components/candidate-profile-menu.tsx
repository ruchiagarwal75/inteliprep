"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { CandidateSignOut } from "@/components/candidate-sign-out";

const nothingToSave = async () => {};

export function CandidateProfileMenu({
  save = nothingToSave,
  compact = false,
}: {
  save?: () => Promise<void>;
  compact?: boolean;
}) {
  const { profile } = useCandidateAccount();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const name = profile?.name || profile?.email?.split("@")[0] || "Your account";
  const words = name.split(/\s+/u);
  const initials = (
    words.length > 1
      ? `${Array.from(words[0])[0]}${Array.from(words.at(-1)!)[0]}`
      : Array.from(name).slice(0, 2).join("")
  ).toLocaleUpperCase();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div
      ref={root}
      className={
        compact ? "profile-account profile-account-compact" : "profile-account"
      }
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="profile-trigger"
        aria-label="Your profile"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="profile-initials" aria-hidden="true">
          {profile ? (
            initials
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <section id={id} className="profile-menu" aria-label="Account details">
          <p className="profile-caption">Signed in as</p>
          <p className="profile-name">{name}</p>
          {profile?.email && <p className="profile-email">{profile.email}</p>}
          <div className="profile-menu-actions">
            <CandidateSignOut save={save} />
          </div>
        </section>
      )}
    </div>
  );
}
