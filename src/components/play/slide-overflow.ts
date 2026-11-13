import { useLayoutEffect, useState, type RefObject } from "react";
/** The slide card owns scrolling. Page position never changes on navigation. */
export function useSlideOverflow(
  reader: RefObject<HTMLElement | null>,
  index: number,
) {
  const [covered, setCovered] = useState(false);
  useLayoutEffect(() => {
    const frame = reader.current?.querySelector("article"),
      body = frame?.querySelector('[aria-label="Slide content"]');
    if (!frame || !body) return;
    let active = true,
      scheduled = 0;
    const measure = () => {
      if (active)
        setCovered(
          frame.scrollHeight - frame.clientHeight - frame.scrollTop > 1,
        );
    };
    const update = () => {
      cancelAnimationFrame(scheduled);
      scheduled = requestAnimationFrame(measure);
    };
    frame.scrollTop = 0;
    update();
    const resize = new ResizeObserver(update);
    resize.observe(frame);
    resize.observe(body);
    void document.fonts.ready.then(update);
    frame.addEventListener("scroll", update, { passive: true });
    return () => {
      active = false;
      cancelAnimationFrame(scheduled);
      resize.disconnect();
      frame.removeEventListener("scroll", update);
    };
  }, [reader, index]);
  return covered;
}
