import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  TranscriptSyncNotice,
  RecoveredInterviewMessages,
} from "@/components/transcript-sync-notice";
it("offers loading the latest version with a preservation notice", () => {
  const html = renderToStaticMarkup(
    createElement(TranscriptSyncNotice, {
      disabled: false,
      onLoad: async () => true,
    }),
  );
  expect(html).toContain("Load latest version");
  expect(html).toContain("drawing and unsent text will be kept");
  expect(html).not.toContain('disabled=""');
});
it("opens recovered messages and offers Resend and Dismiss for each message without changing the draft", () => {
  const html = renderToStaticMarkup(
    createElement(RecoveredInterviewMessages, {
      messages: ['<img onerror="attack()">', "Another unsent answer."],
      onResend: () => {},
      onDismiss: () => {},
    }),
  );
  expect(html).toContain("Unsent messages kept from this tab (2)");
  expect(html).toContain('open=""');
  expect(html).toContain('aria-label="Resend unsent message 1"');
  expect(html).toContain('aria-label="Resend unsent message 2"');
  expect(html).toContain("Your current draft is unchanged");
  expect(html).toContain("Dismiss unsent message 1");
  expect(html).not.toContain("Copy");
  expect(html).toContain("&lt;img");
  expect(html).not.toContain("<img");
});
it("loads the same attempt after a storage conflict", () => {
  const html = renderToStaticMarkup(
    createElement(TranscriptSyncNotice, {
      disabled: false,
      storageConflict: true,
      onLoad: async () => true,
    }),
  );
  expect(html).toContain("This saved interview changed in another tab");
  expect(html).not.toContain("newer attempt");
  expect(html).not.toContain("drawing and unsent text will be kept");
});
