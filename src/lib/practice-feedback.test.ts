import { expect, it } from "vitest";
import { practiceFeedbackSchema } from "@/lib/practice-feedback";
const id = "11111111-1111-4111-8111-111111111111";
it.each([
  { source: "menu", skipped: false, comment: "   useful   " },
  { source: "interview_end", interviewId: id, skipped: false, liked: "loved" },
  { source: "interview_end", interviewId: id, skipped: true },
  { source: "menu", skipped: false, wouldReturn: "maybe" },
])("accepts partial answers and skips %j", (input) => {
  expect(practiceFeedbackSchema.safeParse(input).success).toBe(true);
});
it.each([
  { source: "menu", skipped: false },
  { source: "menu", skipped: false, comment: " \n " },
  { source: "menu", skipped: false, comment: "x".repeat(2001) },
  { source: "menu", skipped: false, liked: "excellent" },
  { source: "menu", skipped: true, userId: id },
  { source: "menu", skipped: true, is_test: false },
  { source: "interview_end", skipped: true },
  { source: "menu", interviewId: id, skipped: true },
  { source: "menu", skipped: "true" },
])("rejects empty, invalid and smuggled input %j", (input) => {
  expect(practiceFeedbackSchema.safeParse(input).success).toBe(false);
});
it("trims comments without interpreting markup", () => {
  expect(
    practiceFeedbackSchema.parse({
      source: "menu",
      skipped: false,
      comment: " <script>alert(1)</script> ",
    }).comment,
  ).toBe("<script>alert(1)</script>");
});
