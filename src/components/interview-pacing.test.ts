import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { InterviewPacing } from "@/components/interview-pacing";
it("explains why Explain my design is disabled when the board is empty", () => {
  const html = renderToStaticMarkup(
    createElement(InterviewPacing, {
      action: "draw",
      hasDrawing: false,
      disabled: false,
      onChoose: vi.fn(),
    }),
  );
  expect(html).toContain(
    "Draw at least one labeled component to start explaining",
  );
  expect(html).toContain('aria-describedby="explain-drawing-hint"');
  expect(html).toContain("Ready to explain");
});
it("explains typed-explanation state and removes the hint once a drawing exists", () => {
  const props = {
    action: "explain" as const,
    hasDrawing: false,
    disabled: false,
    onChoose: vi.fn(),
  };
  expect(renderToStaticMarkup(createElement(InterviewPacing, props))).toContain(
    "Send at least one message walking through your design",
  );
  expect(
    renderToStaticMarkup(
      createElement(InterviewPacing, { ...props, hasDrawing: true }),
    ),
  ).not.toContain("explain-drawing-hint");
});
