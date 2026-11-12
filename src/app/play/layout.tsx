import type { ReactNode } from "react";
import { playAccountId } from "@/lib/play/access";
import { PlayShell } from "@/components/play/play-shell";
export default async function PlayLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userId = await playAccountId();
  return <PlayShell userId={userId}>{children}</PlayShell>;
}
