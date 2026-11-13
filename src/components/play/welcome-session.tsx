"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { WelcomeIntro } from "./welcome-intro";
const opened = z.object({ runId: z.uuid().nullable() });
/** A visible mount starts a run. RSC prefetching never records an impression. */
export function WelcomeSession({ replay }: { replay: boolean }) {
  const { request } = useCandidateAccount();
  const requestId = useRef("");
  const pending = useRef<Promise<string | null> | null>(null);
  const [runId, setRunId] = useState<string | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    pending.current ??= request("/api/play/welcome/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: requestId.current, replay }),
    }).then(async (response) => {
      if (!response.ok) throw Error("start");
      return opened.parse(await response.json()).runId;
    });
    void pending.current
      .then((id) => {
        if (!active) return;
        if (id) setRunId(id);
        else window.location.replace("/play");
      })
      .catch(() => {
        pending.current = null;
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [request, replay, retry]);
  if (runId) return <WelcomeIntro key={runId} runId={runId} />;
  return (
    <section aria-label="Welcome">
      <p role={error ? "alert" : "status"}>
        {error
          ? "Could not open your intro. Please try again."
          : "Opening your quest..."}
      </p>
      {error && (
        <button
          className="practice-primary"
          onClick={() => {
            setError(false);
            setRetry((value) => value + 1);
          }}
        >
          Retry intro
        </button>
      )}
    </section>
  );
}
