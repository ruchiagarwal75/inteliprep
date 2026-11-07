import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { diagramUpdateClause } from "@/lib/pending-diagram-components";
import { candidateDisplayName } from "@/lib/candidate-display-name";
import { InterviewDurationPicker } from "@/components/interview-duration-picker";
import { InterviewStage } from "@/components/interview-stage";
import { PracticeSkeleton } from "@/components/practice-skeleton";
afterEach(() => vi.unstubAllEnvs());
it("formats diagram component lists with articles and a conjunction", () => {
  expect(diagramUpdateClause(["unlabeled rectangle", "Database"])).toBe(
    'I see an unlabeled box and a component labeled "Database" on your diagram.',
  );
  expect(diagramUpdateClause(["API\n service", "Cache", "Database"])).toContain(
    '"API service", a component labeled "Cache", and a component labeled "Database"',
  );
});
it("normalizes provider names while preserving explicit names and mixed case", () => {
  expect(candidateDisplayName({ name: "ruchi agarwal" })).toBe("Ruchi Agarwal");
  expect(
    candidateDisplayName({ name: "ruchi agarwal", nameIsCustom: true }),
  ).toBe("ruchi agarwal");
  expect(candidateDisplayName({ name: "Alex McDonald" })).toBe("Alex McDonald");
});
it("does not expose test duration in production even with the flag", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_ENABLE_TEST_INTERVIEWS", "1");
  expect(
    renderToStaticMarkup(
      createElement(InterviewDurationPicker, {
        value: 45,
        disabled: false,
        onChange: () => {},
      }),
    ),
  ).not.toContain("1 minute (test)");
  vi.stubEnv("NODE_ENV", "development");
  expect(
    renderToStaticMarkup(
      createElement(InterviewDurationPicker, {
        value: 45,
        disabled: false,
        onChange: () => {},
      }),
    ),
  ).toContain("1 minute (test)");
});
it("uses canonical names for saved stage labels", () => {
  const html = renderToStaticMarkup(
    createElement(InterviewStage, {
      phase: {
        id: "discuss-improvements",
        title: "Discuss improvements",
        position: 3,
        total: 5,
      },
      ended: false,
    }),
  );
  expect(html).toContain("Core design");
  expect(html).not.toContain("Discuss improvements");
});
it("loads an interview layout rather than a history list", () => {
  const html = renderToStaticMarkup(
    createElement(PracticeSkeleton, { view: "interview" }),
  );
  expect(html).toContain("skeleton-board");
  expect(html).toContain("skeleton-chat");
  expect(html).not.toContain("skeleton-row");
});
