import { expect, it } from "vitest";
import { brandEmail } from "@/lib/branded-email";
import { approvalEmailPayload } from "@/lib/approval-email";
import {
  newUserNotification,
  spendNotification,
  welcomeNotification,
} from "@/lib/notification-templates";

it.each([
  approvalEmailPayload("person@example.test"),
  welcomeNotification("person@example.test"),
  newUserNotification("person@example.test", "2026-11-15T12:00:00Z"),
  spendNotification("spend_warning", "2026-11-15", 4, 1),
  spendNotification("spend_cap", "2026-11-15", 5, 0),
])(
  "includes the same accessible logo and a text fallback in $subject",
  (payload) => {
    expect(payload.html).toContain(
      'src="https://shardling.com/brand/email/shardling-logo-v1.png"',
    );
    expect(payload.html).toContain('alt="Shardling"');
    expect(payload.html).toContain("max-width:560px");
    expect(payload.html).not.toMatch(/<script|<style|tracking|pixel\.gif/iu);
    expect(payload.text).toBeTruthy();
  },
);

it("preserves plaintext, escapes markup, and links only the app's origin", () => {
  const text =
    "<img src=x onerror=\"alert(1)\"> & 'quoted'\n\nVisit https://shardling.com/play.\nhttps://evil.test/ javascript:alert(1) https://";
  const payload = brandEmail({ subject: '<Title> & "quoted"', text });
  expect(payload.text).toBe(text);
  expect(payload.html).toContain(
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
  expect(payload.html).toContain("&amp; &#39;quoted&#39;");
  expect(payload.html).toContain(
    "<title>&lt;Title&gt; &amp; &quot;quoted&quot;</title>",
  );
  expect(payload.html).toContain('href="https://shardling.com/play"');
  expect(payload.html).toContain(">https://shardling.com/play</a>.");
  expect(payload.html).not.toContain('href="https://evil.test');
  expect(payload.html).not.toContain('href="javascript:');
  expect(payload.html).not.toContain("<img src=x");
});
