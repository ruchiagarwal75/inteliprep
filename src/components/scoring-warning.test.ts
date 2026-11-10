import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { EndInterviewConfirmation } from "@/components/end-interview-confirmation";
import { InterviewTimer } from "@/components/interview-timer";
it.each([
  { durationMinutes: 45 as const, remainingSeconds: 2400, threshold: "15:00" },
  { durationMinutes: 60 as const, remainingSeconds: 3300, threshold: "20:00" },
])(
  "warns at five minutes using the scorer's threshold: $durationMinutes",
  (args) => {
    const html = renderToStaticMarkup(
      createElement(EndInterviewConfirmation, {
        open: true,
        draft: "",
        onCancel: vi.fn(),
        onConfirm: vi.fn(),
        ...args,
      }),
    );
    expect(html).toContain("05:00");
    expect(html).toContain(args.threshold);
    expect(html).toContain("technical answers in 2 stages");
    expect(html).toMatch(/class="practice-primary">Keep going/);
    const timer = renderToStaticMarkup(
      createElement(InterviewTimer, {
        ...args,
        ended: false,
        expired: false,
        testMode: false,
      }),
    );
    expect(timer).toContain(`Scoring starts at ${args.threshold}`);
  },
);
it("stops the time warning after the threshold", () => {
  const html = renderToStaticMarkup(
    createElement(EndInterviewConfirmation, {
      open: true,
      draft: "",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
      durationMinutes: 45,
      remainingSeconds: 1700,
    }),
  );
  expect(html).not.toContain("End anyway?");
  expect(html).toMatch(/class="practice-secondary">Keep going/);
  const timer = renderToStaticMarkup(
    createElement(InterviewTimer, {
      ended: false,
      expired: false,
      testMode: false,
      durationMinutes: 45,
      remainingSeconds: 1700,
    }),
  );
  expect(timer).not.toContain("Scoring starts");
});
