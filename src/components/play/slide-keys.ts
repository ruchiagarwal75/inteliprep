import { useEffect } from "react";
import type { RefObject } from "react";

/** The active slide reader owns these keys, including inside its review dialog. */
export function useSlideKeys({
  reader,
  primary,
  move,
}: {
  reader: RefObject<HTMLElement | null>;
  primary: RefObject<HTMLDivElement | null>;
  move: (direction: number) => void;
}) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (document.querySelector("dialog[open]") &&
          (!(event.target instanceof Node) ||
            !reader.current
              ?.closest("dialog[open]")
              ?.contains(event.target))) ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            '[role="menu"],input,textarea,select,[contenteditable="true"]',
          ))
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      } else if (
        event.key === "Enter" &&
        event.target instanceof HTMLElement &&
        !event.target.closest("button,a,summary")
      ) {
        event.preventDefault();
        primary.current
          ?.querySelector<HTMLButtonElement>(".practice-primary")
          ?.click();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [reader, primary, move]);
}
