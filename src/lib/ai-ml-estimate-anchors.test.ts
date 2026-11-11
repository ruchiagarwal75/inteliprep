import { expect, it } from "vitest";
import { buildInterviewInstructions } from "./interview-instructions";
import { getProblem, listProblems, problemBriefs } from "./problems";

for (const entry of listProblems().filter((p) => p.track === "genai")) {
  for (const level of ["mid", "senior", "staff"] as const) {
    it(`${entry.problemId} has private ${level} anchors without disclosing them`, () => {
      const problem = getProblem(entry.problemId);
      if (!problem?.genai) throw Error("Missing AI / ML configuration");
      const anchors = problem.genai.estimateAnchors[level];
      expect(anchors.length).toBeGreaterThan(0);
      const publicCatalog = JSON.stringify([listProblems(), problemBriefs()]);
      for (const anchor of anchors) {
        expect(anchor.trim().length).toBeGreaterThan(0);
        expect(publicCatalog).not.toContain(anchor);
        for (const phase of problem.phases)
          expect(
            buildInterviewInstructions({ problem, level, phase }),
          ).not.toContain(anchor);
      }
    });
  }
}

it("keeps unprovided recommendation inputs as candidate assumptions", () => {
  const problem = getProblem("video-recommendations");
  expect(problem?.genai?.estimateAnchors.mid.join(" ")).toContain(
    "Peak traffic depends on the candidate's stated assumption",
  );
  for (const level of ["mid", "staff"] as const)
    expect(problem?.genai?.estimateAnchors[level].join(" ")).toContain(
      "assumed 4 bytes",
    );
  expect(problem?.genai?.estimateAnchors.staff.join(" ")).toContain(
    "assumed 500 candidates",
  );
});
