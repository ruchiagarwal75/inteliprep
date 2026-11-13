"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import game from "./game.module.css";
import pixel from "./pixel.module.css";
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
      className={`practice-page ${game.game} ${active === "play" ? pixel.page : ""}`}
      data-pixel-play={active === "play" || undefined}
      data-world={world}
      data-lesson-route={
        pathname.endsWith("/drill") ||
        /^\/play\/rag\/topics\/\d+$/u.test(pathname) ||
        undefined
      }
    >
      {children}
    </main>
  );
}
