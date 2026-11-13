"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useCandidateAccount } from "@/components/candidate-account-context";
import { InterviewDialog } from "@/components/interview-dialog";
import { RAG_BOSS } from "@/lib/mock-access-public";
import { startInterview } from "@/lib/start-interview";
import { newSavedInterview } from "@/lib/saved-interview";
import { InterviewerSprite, BOSS_LINES } from "./interviewer-sprite";
import styles from "./boss.module.css";

export function BossStart({
  free,
  retry = false,
}: {
  free: boolean;
  retry?: boolean;
}) {
  const { request, storage, userId } = useCandidateAccount();
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  const id = useRef<string | null>(null);
  async function start() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const key = `practice:pending-boss:${userId}`;
    if (!id.current) {
      try {
        id.current =
          z.uuid().safeParse(sessionStorage.getItem(key)).data ?? null;
      } catch {}
      id.current ??= crypto.randomUUID();
      try {
        sessionStorage.setItem(key, id.current);
      } catch {}
    }
    try {
      await startInterview({
        choice: {
          problemId: RAG_BOSS.problemId,
          level: RAG_BOSS.level,
          durationMinutes: RAG_BOSS.durationMinutes,
          launch: "rag_boss",
        },
        requestId: id.current,
        replace: false,
        request,
        prepareReplacement: async () => true,
        commit: async (interview) => {
          await storage.saveInterview(
            newSavedInterview(interview, {
              elements: [],
              appState: { viewBackgroundColor: "" },
              files: {},
            }),
          );
          try {
            sessionStorage.removeItem(key);
          } catch {}
          router.push(`/interview/${interview.sessionId}`);
        },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start the boss. Please retry.",
      );
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="practice-primary"
        onClick={() => setOpen(true)}
      >
        {retry ? "Retry boss" : "Start boss"}
      </button>
      <InterviewDialog
        open={open}
        title="Ready for the RAG boss?"
        onClose={() => {
          if (!pending) {
            setOpen(false);
            router.refresh();
          }
        }}
      >
        <div className={styles.confirmArt}>
          <InterviewerSprite scale={3} />
          <div>
            <strong data-game-label>THE INTERVIEWER</strong>
            <p>{BOSS_LINES.confirm}</p>
          </div>
        </div>
        <p>
          {free
            ? "This is your free mock interview. You get one free attempt. It takes 45 minutes, and you can resume if you get disconnected."
            : "Design an enterprise RAG assistant at Mid level. It takes 45 minutes, and you can resume if you get disconnected."}
        </p>
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <button
            type="button"
            className="practice-secondary"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Not yet
          </button>
          <button
            type="button"
            className="practice-primary"
            disabled={pending}
            onClick={() => void start()}
          >
            {pending ? "Starting..." : "Start boss"}
          </button>
        </div>
      </InterviewDialog>
    </>
  );
}
