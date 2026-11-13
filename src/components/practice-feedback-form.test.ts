import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PracticeFeedbackForm } from "@/components/practice-feedback-form";
import { PracticeFeedbackChoices } from "@/components/practice-feedback-choices";
import { AdminPracticeFeedbackDetail } from "@/components/admin-practice-feedback-detail";
import { AdminFeedbackPanel } from "@/components/admin-feedback-panel";
import {
  INPUT_PREFERENCE_CHOICES,
  type PracticeFeedbackRecord,
} from "@/lib/practice-feedback";
vi.mock("@/components/candidate-account-context", () => ({
  useCandidateAccount: () => ({ request: vi.fn() }),
}));
const question = "Would you rather talk than type during the interview?";
it("keeps the existing question order and adds the preference on results only", () => {
  const html = renderToStaticMarkup(
    createElement(PracticeFeedbackForm, {
      interviewId: "11111111-1111-4111-8111-111111111111",
      onComplete: () => {},
    }),
  );
  expect(html.indexOf("How was your practice interview?")).toBeLessThan(
    html.indexOf("Would you do another interview on Shardling?"),
  );
  expect(
    html.indexOf("Would you do another interview on Shardling?"),
  ).toBeLessThan(html.indexOf(question));
  expect(html.indexOf(question)).toBeLessThan(
    html.indexOf("Anything else you want to share?"),
  );
  expect(html).not.toContain("required=");
  const menu = renderToStaticMarkup(
    createElement(PracticeFeedbackForm, { onComplete: () => {} }),
  );
  expect(menu).not.toContain(question);
});
it("uses native optional toggle buttons with an accessible selected answer", () => {
  const html = renderToStaticMarkup(
    createElement(PracticeFeedbackChoices, {
      question,
      choices: INPUT_PREFERENCE_CHOICES,
      value: "talk",
      disabled: false,
      onChange: () => {},
    }),
  );
  expect(html.match(/aria-pressed="true"/gu)).toHaveLength(1);
  expect(html).toContain(">Talk</button>");
  expect(html).toContain(">Type</button>");
  expect(html).toContain(">No preference</button>");
});
const older: PracticeFeedbackRecord = {
  id: "feedback",
  userId: "user",
  interviewId: "interview",
  source: "interview_end",
  skipped: false,
  liked: "loved",
  wouldReturn: "yes",
  comment: null,
  createdAt: "2026-11-10T12:00:00Z",
  updatedAt: "2026-11-10T12:00:00Z",
};
it.each([undefined, null, "talk", "type", "no_preference"] as const)(
  "renders the admin preference %s and keeps old feedback readable",
  (inputPreference) => {
    const html = renderToStaticMarkup(
      createElement(AdminPracticeFeedbackDetail, {
        feedback: { ...older, inputPreference },
      }),
    );
    const label =
      INPUT_PREFERENCE_CHOICES.find(
        ([value]) => value === inputPreference,
      )?.[1] ?? "Not answered";
    expect(html).toContain(`Preferred interview input: ${label}`);
    expect(html).toContain("Loved it");
    expect(html).toContain("Would practice again: Yes");
  },
);
it("shows the separate Talk, Type and No preference counts in the admin summary", () => {
  const data: Parameters<typeof AdminFeedbackPanel>[0]["data"] = {
    entries: [],
    counts: {
      total: 3,
      answered: 3,
      skipped: 0,
      menu: 0,
      loved: 0,
      okay: 0,
      not_for_me: 0,
      yes: 0,
      maybe: 0,
      no: 0,
      talk: 2,
      type: 1,
      no_preference: 0,
    },
    total: 3,
    page: 1,
    pageSize: 20,
    environment: "development",
  };
  const html = renderToStaticMarkup(
    createElement(AdminFeedbackPanel, {
      data,
      search: "",
      includeExcluded: false,
    }),
  );
  expect(html).toMatch(/<dt>Talk<\/dt><dd[^>]*>2<\/dd>/u);
  expect(html).toMatch(/<dt>Type<\/dt><dd[^>]*>1<\/dd>/u);
  expect(html).toMatch(/<dt>No preference<\/dt><dd[^>]*>0<\/dd>/u);
});
