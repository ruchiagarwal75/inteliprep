import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { MascotToggle } from "@/components/mascot-preference";
it("uses a named switch instead of a raw checkbox", () => {
  const html = renderToStaticMarkup(createElement(MascotToggle));
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-label="Show mascot"');
  expect(html).not.toContain("<input");
});
