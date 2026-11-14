import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AdminApprovalEmail } from "./admin-approval-email";

it("explains the unverified brand domain while preserving active access and retry", () => {
  const html = renderToStaticMarkup(
    createElement(AdminApprovalEmail, {
      approved: true,
      busy: false,
      onRetry: () => {},
      notification: {
        id: "notification-id",
        status: "failed",
        canRetry: true,
        referenceId: "reference-id",
        failureCategory: "sender_domain_unverified",
      },
    }),
  );
  expect(html).toContain("Access is active.");
  expect(html).toContain("Verify shardling.com in Resend");
  expect(html).toContain("Retry email");
  expect(html).toContain('role="alert"');
});

it("does not render arbitrary stored provider text", () => {
  const html = renderToStaticMarkup(
    createElement(AdminApprovalEmail, {
      approved: true,
      busy: false,
      onRetry: () => {},
      notification: {
        id: "notification-id",
        status: "failed",
        canRetry: true,
        referenceId: null,
        failureCategory: "private-key private-recipient",
      },
    }),
  );
  expect(html).not.toContain("private-key");
  expect(html).not.toContain("private-recipient");
  expect(html).toContain("Check the failed request in Resend");
});
