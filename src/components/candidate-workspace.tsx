"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProblemSummary } from "@/lib/interview-selection";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { createCandidateBrowserScope } from "@/lib/candidate-browser-scope";
import { CandidateAccountContext } from "@/components/candidate-account-context";
import { InterviewWorkspace } from "@/components/interview-workspace";

export function CandidateWorkspace({
  userId,
  problems,
}: {
  userId: string;
  problems: ProblemSummary[];
}) {
  const [visible, setVisible] = useState(true);
  const [signOutFailed, setSignOutFailed] = useState(false);
  // Identity never mutates on an existing workspace; reauthentication remounts it.
  const [scope] = useState(() =>
    createCandidateBrowserScope(userId, () => {
      setVisible(false);
      window.location.replace("/sign-in");
    }),
  );
  useEffect(() => {
    const detach = scope.attach();
    const { data } = supabaseBrowser().auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user.id === userId) return;
        scope.deactivate();
        setVisible(false);
        window.location.replace("/sign-in");
      },
    );
    const hide = () => {
      document.documentElement.style.visibility = "hidden";
      scope.deactivate();
      setVisible(false);
    };
    const show = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    const channel = new BroadcastChannel("inteliprep-account");
    channel.onmessage = () => {
      scope.deactivate();
      setVisible(false);
      window.location.replace("/sign-in");
    };
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      channel.close();
      detach();
    };
  }, [scope, userId]);
  const account = useMemo(
    () => ({
      userId,
      storage: scope.storage,
      request: scope.request,
      async signOut() {
        // Local state disappears immediately, including while a model reply is pending.
        scope.deactivate();
        setVisible(false);
        setSignOutFailed(false);
        try {
          const response = await fetch("/auth/sign-out", {
            method: "POST",
            signal: AbortSignal.timeout(12_000),
          });
          if (!response.ok) throw new Error("Sign out failed");
          // The server already cleared the cookies; notify the SDK and other tabs.
          await supabaseBrowser().auth.signOut({ scope: "local" });
          const channel = new BroadcastChannel("inteliprep-account");
          channel.postMessage("signed-out");
          channel.close();
          window.location.replace("/sign-in");
        } catch {
          setSignOutFailed(true);
        }
      },
    }),
    [scope, userId],
  );
  if (!visible)
    return (
      <main className="p-6" role={signOutFailed ? "alert" : "status"}>
        {signOutFailed ? (
          <>
            <p>Sign-out couldn’t be completed. Your workspace is hidden.</p>
            <button
              type="button"
              className="mt-3 underline"
              onClick={() => void account.signOut()}
            >
              Retry sign out
            </button>
          </>
        ) : (
          "Returning to sign-in…"
        )}
      </main>
    );
  return (
    <CandidateAccountContext.Provider value={account}>
      <InterviewWorkspace key={userId} problems={problems} />
    </CandidateAccountContext.Provider>
  );
}
