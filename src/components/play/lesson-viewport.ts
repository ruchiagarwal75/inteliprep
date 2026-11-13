import { useLayoutEffect, useState, type RefObject } from "react";

/** Keep document scrolling separate from the overlay's own reader. */
export function useLessonViewport({
  reader,
  controls,
  index,
  review,
}: {
  reader: RefObject<HTMLElement | null>;
  controls: RefObject<HTMLElement | null>;
  index: number;
  review: boolean;
}) {
  const [covered, setCovered] = useState(false);
  useLayoutEffect(() => {
    if (review) return;
    const section = reader.current,
      dock = controls.current,
      frame = section?.querySelector("article");
    if (!section || !dock || !frame) return;
    let active = true,
      scheduled = 0;
    const measure = () => {
      // Short slides still need enough document range to reach the top, outside the card.
      section.style.setProperty(
        "--slide-runway",
        `${Math.max(0, innerHeight - frame.getBoundingClientRect().height - dock.getBoundingClientRect().height - 48)}px`,
      );
      setCovered(
        frame.getBoundingClientRect().bottom >
          dock.getBoundingClientRect().top + 1,
      );
    };
    const update = () => {
      cancelAnimationFrame(scheduled);
      scheduled = requestAnimationFrame(measure);
    };
    const align = () => {
      if (!active) return;
      measure();
      window.scrollTo({
        top: scrollY + frame.getBoundingClientRect().top - 12,
        behavior: "instant",
      });
      update();
    };
    scheduled = requestAnimationFrame(align);
    void document.fonts.ready.then(align);
    const resize = new ResizeObserver(update);
    resize.observe(frame);
    resize.observe(dock);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      active = false;
      cancelAnimationFrame(scheduled);
      resize.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [index, review, reader, controls]);
  return covered;
}
