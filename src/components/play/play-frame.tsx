"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import game from "./game.module.css";
export function PlayFrame({
  active,
  children,
}: {
  active: "play" | "mock" | "progress";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const world = active === "play" ? pathname.split("/")[2] || "rag" : undefined;
  return (
    <main
      className={`practice-page ${game.game}`}
      data-world={world}
      data-lesson-route={pathname.endsWith("/drill") || undefined}
    >
      {children}
    </main>
  );
}
