import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ChatReplyStatus } from "@/components/chat-reply-status";

it("shows a persistent error, the pending message state, and a retry action", () => {
  const html = renderToStaticMarkup(
    createElement(ChatReplyStatus, {
      error: "Interviewer unavailable. Please try again.",
      pending: true,
      disabled: false,
      onRetry: () => {},
    }),
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("Interviewer unavailable");
  expect(html).toContain("awaiting a completed reply");
  expect(html).toContain("Retry reply");
  expect(html).not.toContain('disabled=""');
  expect(html).not.toContain("/sign-in");
});
it("disables retry while busy and omits it when no pending reply can be retried", () => {
  const html = renderToStaticMarkup(
    createElement(ChatReplyStatus, {
      error: "Interviewer unavailable.",
      pending: true,
      disabled: true,
      onRetry: () => {},
    }),
  );
  expect(html).toContain('disabled=""');
  expect(
    renderToStaticMarkup(
      createElement(ChatReplyStatus, {
        error: "Browser save failed.",
        pending: false,
        disabled: false,
      }),
    ),
  ).not.toContain("Retry reply");
});
