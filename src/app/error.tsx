"use client";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    void reportClientError("render", error);
  }, [error]);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <header className="sign-in-header">
        <Brand small />
        <ThemeToggle />
      </header>
      <h1 className="text-xl font-semibold">
        The interview workspace couldn’t load
      </h1>
      <p>
        Your saved interviews remain in this browser. Try loading the workspace
        again.
      </p>
      <button className="practice-primary" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
