"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function InterviewDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="bg-background text-foreground m-auto max-h-[85dvh] w-[min(44rem,92vw)] overflow-y-auto rounded-xl border border-black/20 p-5 shadow-xl backdrop:bg-black/40 dark:border-white/20"
      aria-label={title}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="rounded border px-3 py-1 text-sm"
        >
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
