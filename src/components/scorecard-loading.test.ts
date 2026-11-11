import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScorecardLoading } from "@/components/scorecard-loading";
vi.mock("@/components/mascot-preference", () => ({
  useMascotPreference: () => false,
}));
it("shows the server's current step without timer-based progress", () => {
  const html = renderToStaticMarkup(
    createElement(ScorecardLoading, { stage: "writing" }),
  );
  expect(html).toContain('aria-current="step"');
  expect(html.match(/aria-current="step"/gu)).toHaveLength(1);
  expect(html).toContain("Writing feedback");
  expect(html).toContain("Reading your transcript and diagram");
  expect(html).toContain("Checking the evidence");
  expect(html).not.toContain("up to two minutes");
});
