"use client";

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
      <h1 className="text-xl font-semibold">
        The interview workspace couldn’t load
      </h1>
      <p>
        Your saved interviews remain in this browser. Try loading the workspace
        again.
      </p>
      <button
        className="rounded bg-zinc-900 px-4 py-2 text-white"
        onClick={retry}
      >
        Try again
      </button>
    </main>
  );
}
